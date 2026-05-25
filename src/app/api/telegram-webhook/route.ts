import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TG = "https://api.telegram.org/bot";

// per-chat 狀態 (in-memory、單實例)
type TgState = { model_name?: string; history: { role: "user" | "assistant"; content: string }[] };
const stateByChat = new Map<number, TgState>();
function getState(chatId: number): TgState {
  if (!stateByChat.has(chatId)) stateByChat.set(chatId, { history: [] });
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
  const msg = body.message ?? body.edited_message;
  if (!msg || !msg.text || !msg.chat?.id) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id as number;
  const tgUserId = msg.from?.id as number;
  const tgUsername = msg.from?.username as string | undefined;
  const text = String(msg.text).trim();

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
      await tgSend(token, chatId,
        "👋 *AI 島 Telegram bot*\n\n" +
        "直接傳訊息 → 跟 AI 對話\n\n" +
        "*🤖 AI 對話*\n" +
        "`/model` — 看可用 model 清單 + 當前選擇\n" +
        "`/model <name>` — 切換 model\n" +
        "`/clear` — 清對話歷史\n" +
        "`/whoami` — 看 chat_id / user_id\n\n" +
        "*📊 報表*\n" +
        "`/today` — 今日 KPI\n" +
        "`/kpi 7` — N 天 KPI\n" +
        "`/online` — 線上人數\n" +
        "`/sub` — 訂閱概覽\n" +
        "`/orders [N]` — 最近訂單\n" +
        "`/ai-cost [天數]` — AI 用量\n" +
        "`/quiz` — 今日測驗\n" +
        "`/island` — 島嶼統計\n\n" +
        "*👤 用戶*\n" +
        "`/users` — 最近註冊\n" +
        "`/churn` — 流失預警\n" +
        "`/leetcode [user]` — leetcode 進度\n\n" +
        "*⚙️ 動作*\n" +
        "`/notify [訊息]` — 全站廣播\n" +
        "`/maint on|off` — 維護模式\n" +
        "`/feature key on|off` — feature flag\n" +
        "`/email [user] [內容]`\n" +
        "`/refund [order_id]`\n" +
        "`/grant [user] [amount]`（雙重確認）\n\n" +
        "*🛠️ 系統*\n" +
        "`/errors` — 最近錯誤\n" +
        "`/prefs` — 個人通知偏好",
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "whoami") {
      await tgSend(token, chatId, `🆔 chat_id: \`${chatId}\`\nuser_id: \`${tgUserId}\`\nusername: ${tgUsername ?? "(none)"}\n當前 model: \`${state.model_name ?? "(預設)"}\``);
      return NextResponse.json({ ok: true });
    }

    if (cmd === "clear") {
      state.history = [];
      await tgSend(token, chatId, "✨ 對話歷史已清空");
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
        await tgSend(token, chatId, `❌ /${cmd} 失敗：${escapeHTML(e?.message ?? "unknown")}`, { parseMode: "HTML" });
      }
      return NextResponse.json({ ok: true });
    }

    await tgSend(token, chatId, `❓ 未知命令 /${cmd}、傳 /help 看清單`);
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

  state.history.push({ role: "user", content: text });
  if (state.history.length > 20) state.history.splice(0, state.history.length - 20);

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        {
          role: "system",
          content:
            `你是 AI 島 (aiisland.tw) 的 Telegram admin bot、林董 (Luffy 林、平台 owner) 的私人助理。\n` +
            `用繁體中文台灣口語、簡潔、像同事 / 高階主管助理。\n` +
            `回答以 Telegram 格式為主 — 短段落、可用 *粗體* / \`code\` markdown、列點清楚。\n` +
            `當前 model: ${model.provider}/${model.model_name}。`,
        },
        ...state.history.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      maxTokens: 1500,
    });
    const reply = r.text?.trim() || "(AI 沒回應、再試一次)";
    state.history.push({ role: "assistant", content: reply });
    await tgSend(token, chatId, reply, msg.message_id);
  } catch (e: any) {
    await tgSend(token, chatId, `❌ AI 失敗: ${e?.message ?? "unknown"}`);
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
