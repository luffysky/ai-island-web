import { NextRequest, NextResponse } from "next/server";
import { createPublicKey, verify } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";

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

// per-user in-memory 狀態
type State = { model_name?: string; history: { role: "user" | "assistant"; content: string }[] };
const stateByUser = new Map<string, State>();
function getState(userId: string): State {
  if (!stateByUser.has(userId)) stateByUser.set(userId, { history: [] });
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

  state.history.push({ role: "user", content: prompt });
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
            `你是 AI 島 Discord bot、林董 (Luffy 林、平台 owner) 的私人助理。\n` +
            `繁體中文台灣口語、簡潔、像同事。Discord markdown 可用 (**粗體** \`code\` # heading)。\n` +
            `當前 model: ${model.provider}/${model.model_name}。`,
        },
        ...state.history.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      maxTokens: 1500,
    });
    const reply = (r.text ?? "").trim() || "(AI 沒回應、再試一次)";
    state.history.push({ role: "assistant", content: reply });
    // 短回答 → 純文字（保留 Discord markdown render）+ buttons
    // 長回答 → 同樣純文字（embed.description 上限 4096 比 content 2000 大）
    const payload = reply.length > 1800
      ? embedCard({
          title: "🤖 AI 回覆",
          description: reply.slice(0, 4000),
          color: COLOR.accent,
          footer: `${model.provider}/${model.model_name}`,
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

  // 快指令 — 同步回 (< 3 秒)
  if (cmd === "help") {
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: embedCard({
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
      }),
    });
  }

  if (cmd === "whoami") {
    const state = getState(userId);
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: embedCard({
        title: "🆔 你的 Discord 身份",
        description: "✅ 已通過 owner 白名單驗證",
        color: COLOR.success,
        fields: [
          { name: "user_id", value: `\`${userId}\``, inline: true },
          { name: "username", value: username, inline: true },
          { name: "當前 model", value: `\`${state.model_name ?? "(預設)"}\`` },
        ],
        buttons: [{ label: "📊 後台", url: adminConsoleUrl() }],
      }),
    });
  }

  if (cmd === "clear") {
    getState(userId).history = [];
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: embedCard({
        title: "✨ 對話歷史已清空",
        description: "下一句重新開始、AI 不會帶之前 context",
        color: COLOR.info,
      }),
    });
  }

  if (cmd === "model") {
    const admin = createSupabaseAdmin();
    const { data: models } = await admin
      .from("ai_models")
      .select("model_name, provider, display_name")
      .eq("is_active", true);
    const active = (models as any[]) ?? [];
    if (active.length === 0) {
      return NextResponse.json({
        type: REPLY_MESSAGE,
        data: embedCard({
          title: "⚠️ 沒有 active model",
          description: "去後台 AI 模型管理啟用至少 1 個 model",
          color: COLOR.warn,
          buttons: [{ label: "🔧 去後台啟用", url: `${adminConsoleUrl()}/ai/models` }],
        }),
      });
    }
    const state = getState(userId);
    const cur =
      state.model_name ??
      (active.find((m) => m.provider === "anthropic")?.model_name ?? active[0]?.model_name) ??
      "(none)";
    const list = active
      .map((m) => `• \`${m.model_name}\` (${m.provider})${m.model_name === cur ? " ← **當前**" : ""}`)
      .join("\n");
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: embedCard({
        title: "🎛️ 可用 AI Model",
        description: list,
        color: COLOR.accent,
        footer: "用 /model_set <name> 切換",
        buttons: [{ label: "🔧 後台模型管理", url: `${adminConsoleUrl()}/ai/models` }],
      }),
    });
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
      return NextResponse.json({
        type: REPLY_MESSAGE,
        data: embedCard({
          title: `❌ 找不到 \`${target}\``,
          description: "可能拼錯了、或這個 model 沒啟用",
          color: COLOR.error,
          footer: "用 /model 看可用清單",
        }),
      });
    }
    getState(userId).model_name = found.model_name;
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: embedCard({
        title: "✅ 已切換 model",
        description: `\`${found.provider}/${found.model_name}\``,
        color: COLOR.success,
      }),
    });
  }

  // /ai <prompt> — 慢、用 deferred response
  if (cmd === "ai") {
    const prompt = String(body.data?.options?.[0]?.value ?? "").trim();
    if (!prompt) {
      return NextResponse.json({
        type: REPLY_MESSAGE,
        data: embedCard({
          title: "❌ 沒給 prompt",
          description: "用 `/ai <你的問題>` 傳給 AI",
          color: COLOR.error,
        }),
      });
    }

    // background AI、不 await (Discord 3 秒內必回、立即 return DEFERRED、後台跑完用 PATCH 補)
    runAIAndPatch(appId, interactionToken, userId, prompt).catch((e) => {
      console.warn("[discord-interactions] background AI failed:", e?.message);
    });

    return NextResponse.json({ type: REPLY_DEFERRED });
  }

  return NextResponse.json({
    type: REPLY_MESSAGE,
    data: embedCard({
      title: `❓ 未知命令 /${cmd}`,
      description: "傳 `/help` 看可用清單",
      color: COLOR.warn,
    }),
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "discord-interactions" });
}
