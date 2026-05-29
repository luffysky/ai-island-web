import { NextRequest, NextResponse } from "next/server";
import { createPublicKey, verify } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { tryAnthropicToolRun } from "@/lib/bot-anthropic-tool";
import {
  getOrCreateAdminConversation,
  loadAdminHistory,
  saveAdminTurn,
  clearAdminConversation,
} from "@/lib/bot-admin-conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Discord Bot interactions endpoint
 *
 * Slash commands (透過 /api/admin/discord/setup 一次性註冊):
 *   /ai <prompt>           - 跟 AI 對話 (deferred、用當前 model)
 *   /model                 - 看可用 model 清單 + 當前選擇
 *   /model_set <name>      - 切換 model (per-user in-memory)
 *   /clear                 - 清對話歷史
 *   /whoami                - 看 Discord user_id
 *   /help                  - 看指令清單
 *
 * env:
 *   DISCORD_PUBLIC_KEY        - ed25519 公鑰 (Developer Portal "General Info" 看)
 *   DISCORD_BOT_TOKEN         - bot token (註冊 commands 用、interactions 不用)
 *   DISCORD_APPLICATION_ID    - application id
 *   DISCORD_OWNER_USER_IDS    - 白名單 Discord user_id (逗號分隔)、預設不通
 */

// ed25519 SPKI prefix (Node createPublicKey 需要 DER 格式)
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

let cachedKey: any = null;
function getKey() {
  if (cachedKey) return cachedKey;
  const hex = process.env.DISCORD_PUBLIC_KEY;
  if (!hex) return null;
  try {
    cachedKey = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(hex, "hex")]),
      format: "der",
      type: "spki",
    });
    return cachedKey;
  } catch (e: any) {
    console.warn("[discord-interactions] public key 解析失敗:", e?.message);
    return null;
  }
}

function verifyDiscordSig(timestamp: string, body: string, signature: string): boolean {
  const key = getKey();
  if (!key) return false;
  try {
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

// per-user in-memory 狀態（model 選擇仍 in-memory、對話歷史走 DB persistent）
type State = { model_name?: string };
const stateByUser = new Map<string, State>();
function getState(userId: string): State {
  if (!stateByUser.has(userId)) stateByUser.set(userId, {});
  return stateByUser.get(userId)!;
}

function ownerAllowed(userId: string): boolean {
  const ids = (process.env.DISCORD_OWNER_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

// Discord 色票（hex → decimal）
const COLOR = {
  accent: 0xbd93f9,   // 紫 admin
  success: 0x50fa7b,  // 綠
  error: 0xff5555,    // 紅
  warn: 0xffb86c,     // 橘
  info: 0x8be9fd,     // 青
  gold: 0xffd700,     // 金（林董）
};

function adminConsoleUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const slug = process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2";
  return `${site}/${slug}/admin`;
}

type EmbedField = { name: string; value: string; inline?: boolean };

// 通用 embed 卡 helper
function embedCard(opts: {
  title: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: string;
  buttons?: Array<{ label: string; url?: string; style?: 1 | 2 | 3 | 4 | 5 }>;
  ephemeral?: boolean;
}) {
  const data: any = {
    embeds: [{
      title: opts.title,
      description: opts.description,
      color: opts.color ?? COLOR.accent,
      fields: opts.fields ?? [],
      footer: opts.footer ? { text: opts.footer } : undefined,
      timestamp: new Date().toISOString(),
    }],
  };
  if (opts.buttons && opts.buttons.length > 0) {
    data.components = [{
      type: 1,
      components: opts.buttons.slice(0, 5).map((b) => ({
        type: 2,
        style: b.style ?? (b.url ? 5 : 1),
        label: b.label,
        url: b.url,
      })),
    }];
  }
  if (opts.ephemeral) data.flags = FLAG_EPHEMERAL;
  return data;
}

// AI 錯誤翻人話、不 dump raw JSON
function friendlyDiscordAIError(provider: string, msg: string): { title: string; description: string; hint: string; fixUrl?: string } {
  const lower = msg.toLowerCase();
  if (/401|invalid.*api.*key|authentication/.test(lower)) {
    return {
      title: `⚠️ ${provider} API key 失效`,
      description: "Anthropic 拒絕請求（401 invalid x-api-key）",
      hint: "去後台貼新 key",
      fixUrl: `${adminConsoleUrl()}/ai/models`,
    };
  }
  if (/429|rate.*limit/.test(lower)) {
    return { title: `⚠️ ${provider} 限流（429）`, description: "請求太頻繁、被擋下", hint: "等 1 分鐘再問、或升 API tier" };
  }
  if (/529|overloaded/.test(lower)) {
    return { title: `⚠️ ${provider} 主機過載（529）`, description: "服務商暫時忙不過來", hint: "等 10 秒重試、或換模型" };
  }
  if (/timeout|abort/.test(lower)) {
    return { title: "⚠️ AI 回應太慢", description: "超過時限沒回", hint: "再傳一次（網路抖動）" };
  }
  if (/model.*not.*found|404/.test(lower)) {
    return {
      title: "⚠️ 模型不存在或無權限",
      description: msg.slice(0, 100),
      hint: "去後台換 model",
      fixUrl: `${adminConsoleUrl()}/ai/models`,
    };
  }
  return { title: "⚠️ AI 暫時不能回", description: msg.slice(0, 200), hint: "看 /admin/errors 抓 stack" };
}

// AI deferred response 補 embed（用 PATCH webhook）
async function patchOriginalEmbed(appId: string, interactionToken: string, payload: any) {
  try {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.warn("[discord-interactions] patchOriginalEmbed failed:", (e as any)?.message);
  }
}

// Discord webhook 用 PATCH 把 deferred response 補上 AI 結果
async function patchOriginal(appId: string, interactionToken: string, content: string) {
  try {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000) }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.warn("[discord-interactions] patchOriginal failed:", (e as any)?.message);
  }
}

// background AI、deferred response 配套
async function runAIAndPatch(appId: string, interactionToken: string, userId: string, prompt: string) {
  const state = getState(userId);
  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true).limit(20);
  const activeModels = (models as any[]) ?? [];
  if (activeModels.length === 0) {
    await patchOriginal(appId, interactionToken, "❌ ai_models 沒任何 active");
    return;
  }
  const model =
    (state.model_name && activeModels.find((m) => m.model_name === state.model_name)) ||
    activeModels.find((m) => m.provider === "anthropic") ||
    activeModels[0];

  const { data: keyRow } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!keyRow || !(keyRow as any).enabled) {
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: `⚠️ ${model.provider} key 沒啟用`,
      description: `去後台 AI 模型管理啟用 ${model.provider} 的 key`,
      color: COLOR.warn,
      buttons: [{ label: "🔧 去後台修", url: `${adminConsoleUrl()}/ai/models` }],
    }));
    return;
  }

  let apiKey: string;
  try {
    apiKey = decryptKey((keyRow as any).api_key_encrypted);
  } catch (e: any) {
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: "⚠️ key 解密失敗",
      description: `AI_KEY_SECRET 環境變數可能跟當時加密的不一致`,
      color: COLOR.error,
      footer: `decrypt error: ${(e?.message ?? "unknown").slice(0, 100)}`,
    }));
    return;
  }

  // 對話歷史走 DB：找不到林董 profile 退回 in-memory（fallback、不卡 bot）
  const convId = await getOrCreateAdminConversation({
    channel: "discord_admin",
    channelUserId: userId,
  });
  const history = convId ? await loadAdminHistory(convId, 20) : [];
  const historyPlusCurrent: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: prompt },
  ];

  const { XUEYUE_ADMIN_IDENTITY } = await import("@/lib/xueyue-persona");
  const systemPrompt =
    `${XUEYUE_ADMIN_IDENTITY}\n\n` +
    `# 你的 channel 角色\n` +
    `這條 channel 是 Discord、你是林董 (Luffy 林) 私人助理。\n` +
    `繁體中文台灣口語、簡潔、像同事。Discord markdown 可用 (**粗體** \`code\` # heading)。\n` +
    `當前 model: ${model.provider}/${model.model_name}。`;

  try {
    // 先嘗試 anthropic + tool use（不管使用者選哪個 model、admin tool 都用 anthropic 跑）
    // 找不到 anthropic key/model 才退回原本 callAI（無 tool）
    let reply = "";
    let modelTag = `${model.provider}/${model.model_name}`;
    const toolRun = await tryAnthropicToolRun({
      systemPrompt,
      history: historyPlusCurrent,
      user: { id: `discord:${userId}`, name: userId, role: "owner" },
      preferModel: model.provider === "anthropic" ? model.model_name : undefined,
    });
    if (toolRun && toolRun.ok) {
      reply = (toolRun.text ?? "").trim() || "(AI 沒回應、再試一次)";
      modelTag = `${toolRun.modelUsed} (tool)`;
    } else {
      const r = await callAI({
        provider: model.provider,
        model: model.model_name,
        apiKey,
        messages: [
          { role: "system", content: systemPrompt },
          ...historyPlusCurrent.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        maxTokens: 1500,
      });
      reply = (r.text ?? "").trim() || "(AI 沒回應、再試一次)";
    }
    if (convId) {
      await saveAdminTurn(convId, prompt, reply, modelTag).catch((e) => {
        console.warn("[discord-interactions] saveAdminTurn failed:", (e as any)?.message);
      });
    }
    // 短回答 → 純文字（保留 Discord markdown render）+ buttons
    // 長回答 → 同樣純文字（embed.description 上限 4096 比 content 2000 大）
    const payload = reply.length > 1800
      ? embedCard({
          title: "🤖 AI 回覆",
          description: reply.slice(0, 4000),
          color: COLOR.accent,
          footer: modelTag,
          buttons: [
            { label: "📊 後台", url: adminConsoleUrl() },
            { label: "🛡️ 錯誤監控", url: `${adminConsoleUrl()}/errors` },
          ],
        })
      : {
          content: reply,
          components: [{
            type: 1,
            components: [
              { type: 2, style: 5, label: "📊 後台", url: adminConsoleUrl() },
              { type: 2, style: 5, label: "🤖 AI 模型", url: `${adminConsoleUrl()}/ai/models` },
            ],
          }],
        };
    await patchOriginalEmbed(appId, interactionToken, payload);
  } catch (e: any) {
    const err = friendlyDiscordAIError(model.provider, e?.message ?? "unknown");
    const buttons: any[] = [];
    if (err.fixUrl) buttons.push({ label: "🔧 去後台修", url: err.fixUrl });
    buttons.push({ label: "🛡️ 看 error log", url: `${adminConsoleUrl()}/errors` });
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: err.title,
      description: err.description,
      color: COLOR.error,
      fields: [{ name: "💡 解法", value: err.hint }],
      footer: `${model.provider}/${model.model_name}`,
      buttons,
    }));
    try {
      await admin.from("error_logs").insert({
        source: "discord-interactions",
        level: "error",
        message: `[discord_ai_failed] ${e?.message ?? "unknown"}`,
        extra: { discord_user_id: userId, model: model.model_name, stack: e?.stack?.slice(0, 1000) },
      });
    } catch {}
  }
}

// Discord interaction types
const TYPE_PING = 1;
const TYPE_APP_CMD = 2;

// response types
const REPLY_MESSAGE = 4;
const REPLY_DEFERRED = 5;
const FLAG_EPHEMERAL = 64;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature-ed25519") ?? "";
  const timestamp = req.headers.get("x-signature-timestamp") ?? "";
  const raw = await req.text();

  if (!verifyDiscordSig(timestamp, raw, signature)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // PING - Discord 設 endpoint 時會送一次、必須回 PONG
  if (body.type === TYPE_PING) {
    return NextResponse.json({ type: 1 });
  }

  if (body.type !== TYPE_APP_CMD) {
    return NextResponse.json({ type: REPLY_MESSAGE, data: { content: "未支援的 interaction type" } });
  }

  const cmd = String(body.data?.name ?? "").toLowerCase();
  const userId: string = body.member?.user?.id ?? body.user?.id ?? "";
  const username: string = body.member?.user?.username ?? body.user?.username ?? "";
  const appId: string = body.application_id;
  const interactionToken: string = body.token;

  // === 全部 commands 改 deferred 策略 ===
  // 之前 /help /whoami /clear /model /model_set 全部 sync return、cold start > 3s 都會「未及時回應」
  // 現在統一：立刻 return REPLY_DEFERRED（< 50ms 必達）、background fire-and-forget 跑邏輯後 PATCH webhook
  // 唯一例外：非 owner 的訊息要 ephemeral（不公開）、所以這個 sync return 但極簡（不查 DB）

  // 學員 slash commands（任何 Discord user 可用、不過 owner gate）
  const STUDENT_CMDS = new Set(["quote", "recommend", "vision", "bind"]);
  if (STUDENT_CMDS.has(cmd)) {
    runStudentCommandBg(cmd, body, appId, interactionToken, userId, username).catch((e) => {
      console.warn(`[discord-interactions] student ${cmd} failed:`, e?.message);
    });
    return NextResponse.json({ type: REPLY_DEFERRED });
  }

  if (!ownerAllowed(userId)) {
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: embedCard({
        title: "🔒 此 bot 限白名單 owner 使用",
        description: "管理員需把你的 user_id 加進 `DISCORD_OWNER_USER_IDS` 環境變數",
        color: COLOR.warn,
        fields: [
          { name: "user_id", value: `\`${userId}\``, inline: true },
          { name: "username", value: username, inline: true },
        ],
        footer: "授權後 redeploy 才生效",
        ephemeral: true,
      }),
    });
  }

  // dispatch 到 background 處理、立刻 ACK
  runCommandBg(cmd, body, appId, interactionToken, userId, username).catch((e) => {
    console.warn(`[discord-interactions] bg ${cmd} failed:`, e?.message);
  });
  return NextResponse.json({ type: REPLY_DEFERRED });
}

// 全部 commands 在這裡跑、把結果用 webhook PATCH 補上
async function runCommandBg(
  cmd: string,
  body: any,
  appId: string,
  interactionToken: string,
  userId: string,
  username: string,
) {
  try {
    if (cmd === "help") {
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "👋 AI 島 Discord bot",
        description: "*林董的 AI 助理 + 後台監控*",
        color: COLOR.accent,
        fields: [
          { name: "🤖 AI 對話", value: "`/ai <prompt>` — 跟 AI 對話（含完整網站章節知識）" },
          { name: "🎛️ 模型管理", value: "`/model` 看清單 · `/model_set <name>` 切換" },
          { name: "🧹 對話", value: "`/clear` 清歷史 · `/whoami` 看身份" },
        ],
        footer: "AI 島 v3 · Discord bot",
        buttons: [
          { label: "📊 後台首頁", url: adminConsoleUrl() },
          { label: "🤖 AI 模型", url: `${adminConsoleUrl()}/ai/models` },
          { label: "🛡️ 錯誤監控", url: `${adminConsoleUrl()}/errors` },
        ],
      }));
      return;
    }

    if (cmd === "whoami") {
      const state = getState(userId);
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "🆔 你的 Discord 身份",
        description: "✅ 已通過 owner 白名單驗證",
        color: COLOR.success,
        fields: [
          { name: "user_id", value: `\`${userId}\``, inline: true },
          { name: "username", value: username, inline: true },
          { name: "當前 model", value: `\`${state.model_name ?? "(預設)"}\`` },
        ],
        buttons: [{ label: "📊 後台", url: adminConsoleUrl() }],
      }));
      return;
    }

    if (cmd === "clear") {
      const convId = await getOrCreateAdminConversation({
        channel: "discord_admin",
        channelUserId: userId,
      });
      if (convId) {
        await clearAdminConversation(convId).catch(() => {});
      }
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "✨ 對話歷史已清空",
        description: "下一句重新開始、AI 不會帶之前 context",
        color: COLOR.info,
      }));
      return;
    }

    if (cmd === "model") {
      const admin = createSupabaseAdmin();
      const { data: models } = await admin
        .from("ai_models")
        .select("model_name, provider, display_name")
        .eq("is_active", true);
      const active = (models as any[]) ?? [];
      if (active.length === 0) {
        await patchOriginalEmbed(appId, interactionToken, embedCard({
          title: "⚠️ 沒有 active model",
          description: "去後台 AI 模型管理啟用至少 1 個 model",
          color: COLOR.warn,
          buttons: [{ label: "🔧 去後台啟用", url: `${adminConsoleUrl()}/ai/models` }],
        }));
        return;
      }
      const state = getState(userId);
      const cur =
        state.model_name ??
        (active.find((m) => m.provider === "anthropic")?.model_name ?? active[0]?.model_name) ??
        "(none)";
      const list = active
        .map((m) => `• \`${m.model_name}\` (${m.provider})${m.model_name === cur ? " ← **當前**" : ""}`)
        .join("\n");
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "🎛️ 可用 AI Model",
        description: list,
        color: COLOR.accent,
        footer: "用 /model_set <name> 切換",
        buttons: [{ label: "🔧 後台模型管理", url: `${adminConsoleUrl()}/ai/models` }],
      }));
      return;
    }

    if (cmd === "model_set") {
      const target = String(body.data?.options?.[0]?.value ?? "");
      const admin = createSupabaseAdmin();
      const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
      const active = (models as any[]) ?? [];
      const found = active.find(
        (m) =>
          m.model_name === target ||
          `${m.provider}/${m.model_name}` === target ||
          m.display_name === target,
      );
      if (!found) {
        await patchOriginalEmbed(appId, interactionToken, embedCard({
          title: `❌ 找不到 \`${target}\``,
          description: "可能拼錯了、或這個 model 沒啟用",
          color: COLOR.error,
          footer: "用 /model 看可用清單",
        }));
        return;
      }
      getState(userId).model_name = found.model_name;
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "✅ 已切換 model",
        description: `\`${found.provider}/${found.model_name}\``,
        color: COLOR.success,
      }));
      return;
    }

    if (cmd === "ai") {
      const prompt = String(body.data?.options?.[0]?.value ?? "").trim();
      if (!prompt) {
        await patchOriginalEmbed(appId, interactionToken, embedCard({
          title: "❌ 沒給 prompt",
          description: "用 `/ai <你的問題>` 傳給 AI",
          color: COLOR.error,
        }));
        return;
      }
      await runAIAndPatch(appId, interactionToken, userId, prompt);
      return;
    }

    // 未知命令
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: `❓ 未知命令 /${cmd}`,
      description: "傳 `/help` 看可用清單",
      color: COLOR.warn,
    }));
  } catch (e: any) {
    // background error 也補一張 error embed、不然 user 永遠看 loading
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: `❌ 處理 /${cmd} 失敗`,
      description: (e?.message ?? "unknown").slice(0, 200),
      color: COLOR.error,
      buttons: [{ label: "🛡️ 看 error log", url: `${adminConsoleUrl()}/errors` }],
    })).catch(() => {});
  }
}

// === 學員 slash command handler（DC#7 + DC#1） ===
async function runStudentCommandBg(
  cmd: string,
  body: any,
  appId: string,
  interactionToken: string,
  discordUserId: string,
  discordUsername: string,
) {
  const admin = createSupabaseAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

  // 從 Discord user_id 找 AI 島 user_id（綁定）
  const { data: bind } = await admin.from("user_discord_bind").select("user_id").eq("discord_user_id", discordUserId).maybeSingle();
  const userId = (bind as any)?.user_id ?? null;

  // /bind — 永遠顯示綁定狀態（不需要先綁）
  if (cmd === "bind") {
    if (!userId) {
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "🔗 還沒綁定 AI 島帳號",
        description: "去 AI 島 → 我的設定 → 綁 Discord、即可解鎖 /quote /recommend /vision",
        color: COLOR.warn,
        buttons: [{ label: "🏝️ 去綁定", url: `${siteUrl}/me/settings` }],
      }));
      return;
    }
    const { data: p } = await admin.from("profiles").select("display_name, username, level, xp, streak_days").eq("id", userId).maybeSingle();
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: "✅ 已綁定 AI 島",
      description: `**${(p as any)?.display_name ?? (p as any)?.username ?? "(未命名)"}**`,
      color: COLOR.success,
      fields: [
        { name: "等級", value: `Lv ${(p as any)?.level ?? 1}`, inline: true },
        { name: "XP", value: String((p as any)?.xp ?? 0), inline: true },
        { name: "連勝", value: `${(p as any)?.streak_days ?? 0} 天`, inline: true },
      ],
      buttons: [{ label: "🏝️ 學習中心", url: `${siteUrl}/me` }],
    }));
    return;
  }

  // 其他學員 cmd 都需要先綁
  if (!userId) {
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: "🔗 先綁定 AI 島帳號",
      description: "用 `/bind` 看綁定狀態、或去網站綁",
      color: COLOR.warn,
      buttons: [{ label: "🏝️ 去綁定", url: `${siteUrl}/me/settings` }],
    }));
    return;
  }

  if (cmd === "quote") {
    // dev_quotes 真實 column：quote / author / translation_zh / category
    const { data: quoteList } = await admin
      .from("dev_quotes")
      .select("quote, author, translation_zh, category")
      .eq("is_active", true)
      .limit(100);
    const list = (quoteList as any[]) ?? [];
    const pick = list[Math.floor(Math.random() * list.length)];
    if (!pick) {
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "💭 今日金句",
        description: "今天的金句還在路上、之後再試~",
        color: COLOR.info,
      }));
      return;
    }
    const original = String(pick.quote ?? "").trim();
    const zh = String(pick.translation_zh ?? "").trim();
    const desc = zh && zh !== original
      ? `*"${original}"*\n\n${zh}\n\n— ${pick.author ?? "佚名"}`
      : `*"${original}"*\n\n— ${pick.author ?? "佚名"}`;
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: "💭 今日金句",
      description: desc,
      color: COLOR.gold,
      footer: pick.category ? `#${pick.category}` : undefined,
      buttons: [{ label: "🏝️ 學習中心", url: `${siteUrl}/me` }],
    }));
    return;
  }

  if (cmd === "recommend") {
    // 找下一課（user 未完成的 lesson、最近章節）
    const { data: progress } = await admin.from("lesson_progress").select("chapter_id, lesson_id").eq("user_id", userId).order("completed_at", { ascending: false }).limit(1);
    const lastChapter = ((progress ?? []) as any[])[0]?.chapter_id ?? 1;
    const { data: nextLessons } = await admin.from("chapters")
      .select("id, title, lessons")
      .gte("id", lastChapter)
      .order("id", { ascending: true })
      .limit(3);
    const recs = ((nextLessons ?? []) as any[]).slice(0, 2);
    await patchOriginalEmbed(appId, interactionToken, embedCard({
      title: "📚 雪鑰推薦下一步",
      description: recs.map((c) => `• **Ch${c.id} ${c.title}**`).join("\n") || "你已經完成全部章節了 🎉",
      color: COLOR.accent,
      buttons: [{ label: "🏝️ 學習中心", url: `${siteUrl}/me` }],
    }));
    return;
  }

  if (cmd === "vision") {
    const opts = body.data?.options ?? [];
    const attachId = opts.find((o: any) => o.name === "image")?.value;
    const question = opts.find((o: any) => o.name === "question")?.value as string | undefined;
    const attachments = body.data?.resolved?.attachments ?? {};
    const att = attachments[attachId];
    if (!att?.url) {
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "❌ 沒收到圖片",
        description: "請確認附件已上傳",
        color: COLOR.error,
      }));
      return;
    }

    // AI gate（learning quota）
    const { requireAiAction } = await import("@/lib/ai-gate");
    const gate = await requireAiAction(userId, "tutor_thread");
    if (!gate.ok) {
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "⏸️ AI 額度已用完",
        description: gate.error ?? "本月 tutor 額度耗盡、明月恢復",
        color: COLOR.warn,
      }));
      return;
    }

    // 下載圖、base64、丟給 anthropic vision
    try {
      const imgRes = await fetch(att.url, { signal: AbortSignal.timeout(8000) });
      if (!imgRes.ok) throw new Error("圖片下載失敗");
      const buf = await imgRes.arrayBuffer();
      if (buf.byteLength > 8 * 1024 * 1024) {
        await patchOriginalEmbed(appId, interactionToken, embedCard({
          title: "❌ 圖片太大",
          description: "請壓縮到 8MB 以下",
          color: COLOR.error,
        }));
        return;
      }
      const mediaType = att.content_type ?? "image/jpeg";
      const dataB64 = Buffer.from(buf).toString("base64");

      const { getProviderKey } = await import("@/lib/ai-crypto");
      const { getModelNameForUsage } = await import("@/lib/ai-usage-models");
      const { callAI } = await import("@/lib/ai-providers");
      const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");
      const provider = providerForModel(modelName);
      const apiKey = await getProviderKey(provider);
      if (!apiKey) {
        await patchOriginalEmbed(appId, interactionToken, embedCard({
          title: "❌ AI 服務暫不可用",
          description: "管理員設定中、稍後再試",
          color: COLOR.error,
        }));
        return;
      }
      const { XUEYUE_STUDENT_IDENTITY } = await import("@/lib/xueyue-persona");
      const sysPrompt = `${XUEYUE_STUDENT_IDENTITY}\n\n用國中生程度回答、簡潔、繁體中文、120 字內、不嚇人。`;
      const r = await callAI({
        provider, model: modelName, apiKey,
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: [
              { type: "text", text: question || "幫我看這張圖、給我重點觀察" },
              { type: "image", mediaType, data: dataB64 },
            ] },
        ],
        temperature: 0.5,
        maxTokens: 600,
      });
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "👁️ 雪鑰看圖回應",
        description: r.text?.slice(0, 3500) || "(沒回應、再試一次)",
        color: COLOR.accent,
        footer: `${provider}/${modelName}`,
      }));
    } catch (e: any) {
      await patchOriginalEmbed(appId, interactionToken, embedCard({
        title: "❌ 看圖失敗",
        description: e?.message?.slice(0, 200) ?? "unknown",
        color: COLOR.error,
      }));
    }
    return;
  }
}

function providerForModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

// GET 給 cron keep-warm 用 — 主動預熱所有 cold path、不只 touch route
// 之前只回 {ok:true}、module cache 可能仍冷、第一個真實 interaction 還是會超 3 秒
export async function GET() {
  const t0 = Date.now();
  const warmed: string[] = [];

  // 1. 預熱 ed25519 key parse（cold 約 50-200ms）
  try {
    getKey();
    warmed.push("ed25519_key");
  } catch {}

  // 2. 預熱 supabase admin client + 一個輕量 query
  try {
    const admin = createSupabaseAdmin();
    await admin.from("ai_models").select("id").limit(1);
    warmed.push("supabase_admin");
  } catch {}

  // 3. 預熱 ai-crypto decrypt 模組（import 副作用、不真 decrypt）
  try {
    void decryptKey;
    warmed.push("ai_crypto");
  } catch {}

  return NextResponse.json({
    ok: true,
    service: "discord-interactions",
    warmed,
    elapsed_ms: Date.now() - t0,
  });
}
