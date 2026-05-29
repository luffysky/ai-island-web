import { NextRequest, NextResponse, after } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { tryAnthropicToolRun } from "@/lib/bot-anthropic-tool";
import {
  getOrCreateAdminConversation,
  loadAdminHistory,
  saveAdminTurn,
  clearAdminConversation,
} from "@/lib/bot-admin-conversation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TG = "https://api.telegram.org/bot";

// per-chat 狀態（model 選擇 in-memory；對話歷史走 DB persistent）
type TgState = { model_name?: string };
const stateByChat = new Map<number, TgState>();
function getState(chatId: number): TgState {
  if (!stateByChat.has(chatId)) stateByChat.set(chatId, {});
  return stateByChat.get(chatId)!;
}

function ownerAllowed(userId: number, username?: string): boolean {
  const ids = (process.env.TELEGRAM_OWNER_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.includes(String(userId))) return true;
  const names = (process.env.TELEGRAM_OWNER_USERNAMES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (username && names.includes(username.toLowerCase())) return true;
  // 沒設白名單 = 預設禁用 (防陌生人燒 token)
  return ids.length === 0 && names.length === 0 ? false : false;
}

// Telegram MarkdownV2 escape (保留我們刻意加的 markdown)
// HTML 模式比較好用：只 escape < > & 三個、其他自由
function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function tgSend(
  token: string,
  chatId: number,
  text: string,
  options?: {
    replyTo?: number;
    keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  },
) {
  try {
    const body: any = {
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    };
    if (options?.replyTo) body.reply_to_message_id = options.replyTo;
    if (options?.parseMode) body.parse_mode = options.parseMode;
    else body.parse_mode = "Markdown";
    if (options?.keyboard) body.reply_markup = { inline_keyboard: options.keyboard };

    await fetch(`${TG}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.warn("[telegram-webhook] send failed:", (e as any)?.message);
  }
}

// LINE 指令 → Telegram 美化
function adminConsoleUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const slug = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
  return `${site}/${slug}/admin`;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
}

// AI 錯誤翻人話、不 dump raw JSON 給林董看醜訊息
function friendlyTelegramAIError(provider: string, msg: string): { text: string; hint: string; fixUrl?: string } {
  const lower = msg.toLowerCase();
  if (/401|invalid.*api.*key|authentication/.test(lower)) {
    return {
      text: `${provider} API key 失效（401）`,
      hint: "去後台貼新 key",
      fixUrl: `${adminConsoleUrl()}/ai/models`,
    };
  }
  if (/429|rate.*limit/.test(lower)) {
    return { text: `${provider} 限流（429）`, hint: "等 1 分鐘再問、或升 API tier" };
  }
  if (/529|overloaded/.test(lower)) {
    return { text: `${provider} 主機過載（529）`, hint: "等 10 秒重試、或換模型" };
  }
  if (/timeout|abort/.test(lower)) {
    return { text: "AI 回應太慢、超過時限", hint: "再傳一次" };
  }
  if (/model.*not.*found|404/.test(lower)) {
    return {
      text: `模型不存在或無權限`,
      hint: "去後台換 model",
      fixUrl: `${adminConsoleUrl()}/ai/models`,
    };
  }
  return { text: msg.slice(0, 100), hint: "看 /admin/errors 抓 stack" };
}

function buildAIErrorHTML(err: { text: string; hint: string; fixUrl?: string }, model: string): { html: string; keyboard?: any[][] } {
  const html = [
    "⚠️ <b>AI 暫時不能回</b>",
    "",
    `<i>${escapeHTML(err.text)}</i>`,
    "",
    `💡 <b>解法：</b>${escapeHTML(err.hint)}`,
    "",
    `<code>model: ${escapeHTML(model)}</code>`,
  ].join("\n");
  const keyboard: any[][] = [];
  if (err.fixUrl) keyboard.push([{ text: "🔧 去後台修", url: err.fixUrl }]);
  keyboard.push([{ text: "🛡️ 看 error log", url: `${adminConsoleUrl()}/errors` }]);
  return { html, keyboard };
}

// 把 AI 回覆包成 Telegram HTML 美化卡（footer 帶 model / 時間 / 後台按鈕）
function buildAIReplyHTML(reply: string, modelTag: string): { html: string; keyboard: any[][] } {
  const escapedReply = escapeHTML(reply.slice(0, 3500));
  const html = [
    escapedReply,
    "",
    `━━━━━━━━━━`,
    `🤖 <i>${escapeHTML(modelTag)}</i> · <code>${new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" })}</code>`,
  ].join("\n");
  const keyboard: any[][] = [
    [
      { text: "📊 後台", url: adminConsoleUrl() },
      { text: "🔁 切 model", callback_data: "switch_model" },
    ],
  ];
  return { html, keyboard };
}

// 把 BotReply.text 包成 Telegram HTML 美化版
function dressUpAdminReply(rawText: string, cmd: string): { html: string; keyboard?: any[][] } {
  // 標題列 (第一行通常是「📊 今日 KPI」之類) — 包成 <b>
  const lines = rawText.split("\n");
  const titleIdx = lines.findIndex((l) => l.trim() && !l.trim().startsWith("/"));
  if (titleIdx >= 0) {
    lines[titleIdx] = `<b>${escapeHTML(lines[titleIdx])}</b>`;
    // 之後行 escape
    for (let i = 0; i < lines.length; i++) {
      if (i !== titleIdx) lines[i] = escapeHTML(lines[i]);
    }
  } else {
    for (let i = 0; i < lines.length; i++) lines[i] = escapeHTML(lines[i]);
  }
  const html = lines.join("\n");

  // 按指令類型加 inline keyboard 按鈕
  const cmdToPath: Record<string, string> = {
    today: "",
    kpi: "/kpi",
    users: "/users",
    churn: "/churn",
    errors: "/errors",
    online: "/analytics",
    sub: "/subscriptions",
    orders: "/orders",
    "ai-cost": "/ai/usage",
    ai_cost: "/ai/usage",
    quiz: "/analytics/learning-events",
    island: "/analytics",
    leetcode: "/users",
  };
  const path = cmdToPath[cmd];
  if (path !== undefined) {
    const url = adminConsoleUrl() + path;
    return {
      html,
      keyboard: [[{ text: `📊 打開後台 /admin${path}`, url }]],
    };
  }
  return { html };
}

/**
 * Telegram webhook entry — fast-ack pattern
 *
 * 立刻 return 200 給 Telegram、AI / fetch 等慢操作走 after() background。
 * 對應問題：
 *   (1) AI 處理超過 30s 會被 Telegram 視為 timeout、retry 重複處理
 *   (2) deploy 期間訊息可能被 retry、但容器收到後一直慢回容易丟訊息
 *
 * after() 是 Next.js 15.1+ 官方 background task API、保證 callback 在
 * function 生命週期內跑完、不會被 serverless 提前 kill。
 */
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "no_token" });

  // 可選 secret token 驗證 (Telegram 設 webhook 時帶、防偽造)
  const expectSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectSecret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expectSecret) return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));

  // fast-ack：立刻回 200、avoid Telegram timeout + retry
  after(() =>
    processTelegramUpdate(token, body).catch((e) =>
      console.error("[telegram-webhook] bg fail:", e?.message ?? "unknown"),
    ),
  );

  return NextResponse.json({ ok: true });
}

/**
 * 真正處理 Telegram update — 從 after() 背景跑
 * 原本 POST 內邏輯整段搬進來、保留 `return NextResponse.json(...)` 不動
 * （在 background 內它們就是 early-return、不會真的送 response）
 */
async function processTelegramUpdate(token: string, body: any) {
  const msg = body.message ?? body.edited_message;
  if (!msg || !msg.chat?.id) return NextResponse.json({ ok: true });
  // 接受文字 OR 圖片（圖片可帶 caption）
  if (!msg.text && !msg.photo) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id as number;
  const tgUserId = msg.from?.id as number;
  const tgUsername = msg.from?.username as string | undefined;
  const text = String(msg.text ?? msg.caption ?? "").trim();

  if (!ownerAllowed(tgUserId, tgUsername)) {
    await tgSend(token, chatId,
      `🔒 此 bot 限白名單 owner 使用。\n\n` +
      `你的 Telegram:\nuser_id: \`${tgUserId}\`\nusername: ${tgUsername ?? "(none)"}\n\n` +
      `要授權自己: Zeabur env 加 \`TELEGRAM_OWNER_USER_IDS=${tgUserId}\` 或 \`TELEGRAM_OWNER_USERNAMES=${tgUsername ?? "your_handle"}\``,
    );
    return NextResponse.json({ ok: true });
  }

  // 指令
  if (text.startsWith("/")) {
    const [rawCmd, ...args] = text.slice(1).split(/\s+/);
    const cmd = rawCmd.toLowerCase().split("@")[0]; // 群組 bot 訊息會帶 @bot_name、剝掉
    const state = getState(chatId);

    if (cmd === "start" || cmd === "help") {
      const html = [
        "👋 <b>AI 島 Telegram bot</b>",
        "<i>直接傳訊息 → 跟 AI 對話</i>",
        "",
        "🤖 <b>AI 對話</b>",
        "<code>/model</code> 看 model 清單 / <code>/model &lt;name&gt;</code> 切換",
        "<code>/clear</code> 清歷史 · <code>/whoami</code> 看身份",
        "",
        "📊 <b>報表</b>",
        "<code>/today</code> · <code>/kpi 7</code> · <code>/online</code> · <code>/sub</code>",
        "<code>/orders</code> · <code>/ai-cost</code> · <code>/quiz</code> · <code>/island</code>",
        "",
        "👤 <b>用戶</b>",
        "<code>/users</code> · <code>/churn</code> · <code>/leetcode [user]</code>",
        "",
        "⚙️ <b>動作</b>",
        "<code>/notify [訊息]</code> · <code>/maint on|off</code> · <code>/feature key on|off</code>",
        "<code>/email [user] [內容]</code> · <code>/refund [id]</code> · <code>/grant [user] [amount]</code>",
        "",
        "🛡️ <b>系統</b>",
        "<code>/errors</code> · <code>/prefs</code>",
      ].join("\n");
      await tgSend(token, chatId, html, {
        parseMode: "HTML",
        keyboard: [
          [{ text: "📊 後台首頁", url: adminConsoleUrl() }],
          [
            { text: "📈 今日 KPI", callback_data: "cmd:today" },
            { text: "🛡️ 錯誤監控", url: `${adminConsoleUrl()}/errors` },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === "whoami") {
      const html = [
        "🆔 <b>你的 Telegram 身份</b>",
        "",
        `<code>chat_id: ${chatId}</code>`,
        `<code>user_id: ${tgUserId}</code>`,
        `<code>username: ${escapeHTML(tgUsername ?? "(none)")}</code>`,
        `<code>model: ${escapeHTML(state.model_name ?? "(預設)")}</code>`,
        "",
        "✅ <i>已通過 owner 白名單驗證</i>",
      ].join("\n");
      await tgSend(token, chatId, html, {
        parseMode: "HTML",
        keyboard: [[{ text: "📊 後台", url: adminConsoleUrl() }]],
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === "clear") {
      const convId = await getOrCreateAdminConversation({
        channel: "telegram_admin",
        channelUserId: String(tgUserId),
      });
      if (convId) {
        await clearAdminConversation(convId).catch(() => {});
      }
      await tgSend(token, chatId, "✨ <b>對話歷史已清空</b>\n下一句重新開始。", {
        parseMode: "HTML",
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === "model") {
      const adminDb = createSupabaseAdmin();
      const { data: models } = await adminDb.from("ai_models").select("model_name, provider, display_name").eq("is_active", true);
      const active = ((models as any[]) ?? []);

      if (args.length === 0) {
        const cur = state.model_name ?? (active.find((m) => m.provider === "anthropic")?.model_name ?? active[0]?.model_name) ?? "(none)";
        if (active.length === 0) {
          await tgSend(token, chatId, "❌ 沒有 active model、去 /admin/ai/models 啟用");
        } else {
          const list = active.map((m) => `• \`${m.model_name}\` (${m.provider})${m.model_name === cur ? " ← *當前*" : ""}`).join("\n");
          await tgSend(token, chatId, `*可用 model* (傳 \`/model <name>\` 切換)\n\n${list}`);
        }
      } else {
        const target = args.join(" ");
        const found = active.find((m) => m.model_name === target || `${m.provider}/${m.model_name}` === target || m.display_name === target);
        if (!found) {
          await tgSend(token, chatId, `❌ 找不到 \`${target}\`。傳 /model 看清單。`);
        } else {
          state.model_name = found.model_name;
          await tgSend(token, chatId, `✅ 已切到 \`${found.provider}/${found.model_name}\``);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 嘗試把 LINE bot 指令也接過來
    const LINE_CMDS = new Set([
      "today", "kpi", "users", "churn", "errors", "who",
      "online", "sub", "orders", "ai-cost", "ai_cost",
      "notify", "maint", "leetcode", "island", "quiz",
      "refund", "feature", "email", "grant", "prefs",
    ]);
    if (LINE_CMDS.has(cmd)) {
      try {
        const { runBotCommand } = await import("@/lib/line-bot-commands");
        const fakeAdminLineUser = {
          id: `tg:${tgUserId}`,
          name: tgUsername ?? "Telegram user",
          role: "owner",
        };
        const reply = await runBotCommand(text, fakeAdminLineUser);
        const { html, keyboard } = dressUpAdminReply(reply.text, cmd);
        await tgSend(token, chatId, html, {
          replyTo: msg.message_id,
          parseMode: "HTML",
          keyboard,
        });
      } catch (e: any) {
        await tgSend(token, chatId, `❌ <b>/${escapeHTML(cmd)} 失敗</b>\n<i>${escapeHTML(e?.message ?? "unknown")}</i>`, { parseMode: "HTML" });
      }
      return NextResponse.json({ ok: true });
    }

    await tgSend(token, chatId, `❓ <b>未知命令 /${escapeHTML(cmd)}</b>\n傳 <code>/help</code> 看清單`, {
      parseMode: "HTML",
      keyboard: [[{ text: "📖 /help", callback_data: "cmd:help" }]],
    });
    return NextResponse.json({ ok: true });
  }

  // 一般訊息 → AI
  const state = getState(chatId);
  const adminDb = createSupabaseAdmin();
  const { data: models } = await adminDb.from("ai_models").select("*").eq("is_active", true).limit(20);
  const activeModels = (models as any[]) ?? [];
  if (activeModels.length === 0) {
    await tgSend(token, chatId, "❌ ai_models 沒任何 active");
    return NextResponse.json({ ok: true });
  }

  // model 選擇優先順序: user 指定 > usage_models("telegram_admin") > anthropic > 第一個
  let model =
    (state.model_name && activeModels.find((m) => m.model_name === state.model_name)) ||
    (await pickModelForUsage("admin_assistant", activeModels).catch(() => null)) ||
    activeModels.find((m) => m.provider === "anthropic") ||
    activeModels[0];

  if (!model) {
    await tgSend(token, chatId, "❌ 沒可用 model");
    return NextResponse.json({ ok: true });
  }

  const { data: keyRow } = await adminDb
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!keyRow || !(keyRow as any).enabled) {
    await tgSend(token, chatId, `❌ ${model.provider} key 沒 enabled、去 /admin/ai/models 啟用`);
    return NextResponse.json({ ok: true });
  }

  let apiKey: string;
  try {
    apiKey = decryptKey((keyRow as any).api_key_encrypted);
  } catch (e: any) {
    await tgSend(token, chatId, `❌ key 解密失敗 (AI_KEY_SECRET 變過？): ${e?.message}`);
    return NextResponse.json({ ok: true });
  }

  // 對話歷史走 DB（找不到林董 profile → in-memory fallback、history=[]）
  const convId = await getOrCreateAdminConversation({
    channel: "telegram_admin",
    channelUserId: String(tgUserId),
  });
  const history = convId ? await loadAdminHistory(convId, 20) : [];
  const historyPlusCurrent: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: text },
  ];

  const systemPrompt =
    `你是 AI 島 (ai-island-web.snowrealm.pet) 的 Telegram admin bot、林董 (Luffy 林、平台 owner) 的私人助理。\n` +
    `用繁體中文台灣口語、簡潔、像同事 / 高階主管助理。\n` +
    `回答以 Telegram 格式為主 — 短段落、可用 *粗體* / \`code\` markdown、列點清楚。\n` +
    `當前 model: ${model.provider}/${model.model_name}。`;

  // 圖片 vision：msg.photo[] 是不同解析度、抓最大張、下載 base64 餵 AI
  const photos: Array<{ data: string; mediaType: string }> = [];
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    if (largest?.file_id) {
      try {
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largest.file_id}`, {
          signal: AbortSignal.timeout(5000),
        });
        const fileInfo = await fileInfoRes.json();
        const filePath = fileInfo?.result?.file_path;
        if (filePath) {
          const binRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
            signal: AbortSignal.timeout(8000),
          });
          if (binRes.ok) {
            const buf = await binRes.arrayBuffer();
            if (buf.byteLength <= 8 * 1024 * 1024) {
              const mediaType = filePath.endsWith(".png") ? "image/png" : filePath.endsWith(".webp") ? "image/webp" : "image/jpeg";
              photos.push({ data: Buffer.from(buf).toString("base64"), mediaType });
            }
          }
        }
      } catch (e: any) {
        console.warn("[telegram-webhook] image download failed:", e?.message);
      }
    }
  }

  try {
    // 先嘗試 anthropic + tool use（不管使用者選哪個 model、admin tool 都用 anthropic 跑）
    // 找不到 anthropic key/model 才退回原本 callAI（無 tool）
    // 含圖片強制走 callAI（vision 不走 tool use loop）
    let reply = "";
    let modelTag = `${model.provider}/${model.model_name}`;
    const hasImages = photos.length > 0;
    const toolRun = hasImages ? null : await tryAnthropicToolRun({
      systemPrompt,
      history: historyPlusCurrent,
      user: { id: `tg:${tgUserId}`, name: tgUsername ?? "Telegram user", role: "owner" },
      preferModel: model.provider === "anthropic" ? model.model_name : undefined,
    });
    if (toolRun && toolRun.ok) {
      reply = (toolRun.text ?? "").trim() || "(AI 沒回應、再試一次)";
      modelTag = `${toolRun.modelUsed} (tool)`;
    } else {
      // multimodal: 最後一條 user message 改成 [text + images]
      const historyMsgs = historyPlusCurrent.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const lastUserContent = hasImages
        ? [
            { type: "text" as const, text: text || "幫我看這張圖、給我重點觀察" },
            ...photos.map((p) => ({ type: "image" as const, mediaType: p.mediaType, data: p.data })),
          ]
        : text;
      const r = await callAI({
        provider: model.provider,
        model: model.model_name,
        apiKey,
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMsgs,
          { role: "user", content: lastUserContent },
        ],
        temperature: 0.7,
        maxTokens: 1500,
      });
      reply = r.text?.trim() || "(AI 沒回應、再試一次)";
    }
    if (convId) {
      await saveAdminTurn(convId, text, reply, modelTag).catch((e) => {
        console.warn("[telegram-webhook] saveAdminTurn failed:", (e as any)?.message);
      });
    }
    const { html, keyboard } = buildAIReplyHTML(reply, modelTag);
    await tgSend(token, chatId, html, {
      parseMode: "HTML",
      replyTo: msg.message_id,
      keyboard,
    });
  } catch (e: any) {
    const err = friendlyTelegramAIError(model.provider, e?.message ?? "unknown");
    const { html, keyboard } = buildAIErrorHTML(err, `${model.provider}/${model.model_name}`);
    await tgSend(token, chatId, html, { parseMode: "HTML", keyboard });
    try {
      await adminDb.from("error_logs").insert({
        source: "telegram-webhook",
        level: "error",
        message: `[tg_ai_failed] ${e?.message ?? "unknown"}`,
        extra: { tg_user_id: tgUserId, model: model.model_name, stack: e?.stack?.slice(0, 1000) },
      });
    } catch {}
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
