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
    await patchOriginal(appId, interactionToken, `❌ ${model.provider} key 沒 enable、去 /admin/ai/models 啟用`);
    return;
  }

  let apiKey: string;
  try {
    apiKey = decryptKey((keyRow as any).api_key_encrypted);
  } catch (e: any) {
    await patchOriginal(appId, interactionToken, `❌ key 解密失敗: ${e?.message ?? "unknown"}`);
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
    await patchOriginal(appId, interactionToken, reply);
  } catch (e: any) {
    await patchOriginal(appId, interactionToken, `❌ AI 失敗: ${e?.message ?? "unknown"}`);
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
      data: {
        content:
          `🔒 此 bot 限白名單 owner 使用。\n\n` +
          `你的 Discord:\nuser_id: \`${userId}\`\nusername: ${username}\n\n` +
          `要授權自己: Zeabur env 加 \`DISCORD_OWNER_USER_IDS=${userId}\` 後 redeploy`,
        flags: FLAG_EPHEMERAL,
      },
    });
  }

  // 快指令 — 同步回 (< 3 秒)
  if (cmd === "help") {
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: {
        content:
          "👋 **AI 島 Discord bot**\n\n" +
          "`/ai <prompt>` — 跟 AI 對話\n" +
          "`/model` — 看可用 model 清單 + 當前選擇\n" +
          "`/model_set <name>` — 切換 model\n" +
          "`/clear` — 清對話歷史\n" +
          "`/whoami` — 看 Discord user_id\n" +
          "`/help` — 看這份",
      },
    });
  }

  if (cmd === "whoami") {
    const state = getState(userId);
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: {
        content:
          `🆔 user_id: \`${userId}\`\n` +
          `username: ${username}\n` +
          `當前 model: \`${state.model_name ?? "(預設)"}\``,
      },
    });
  }

  if (cmd === "clear") {
    getState(userId).history = [];
    return NextResponse.json({ type: REPLY_MESSAGE, data: { content: "✨ 對話歷史已清空" } });
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
        data: { content: "❌ 沒有 active model、去 /admin/ai/models 啟用" },
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
      data: { content: `**可用 model** (用 \`/model_set\` 切換)\n\n${list}` },
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
        data: { content: `❌ 找不到 \`${target}\`、用 /model 看清單` },
      });
    }
    getState(userId).model_name = found.model_name;
    return NextResponse.json({
      type: REPLY_MESSAGE,
      data: { content: `✅ 已切到 \`${found.provider}/${found.model_name}\`` },
    });
  }

  // /ai <prompt> — 慢、用 deferred response
  if (cmd === "ai") {
    const prompt = String(body.data?.options?.[0]?.value ?? "").trim();
    if (!prompt) {
      return NextResponse.json({ type: REPLY_MESSAGE, data: { content: "❌ 沒給 prompt" } });
    }

    // background AI、不 await (Discord 3 秒內必回、立即 return DEFERRED、後台跑完用 PATCH 補)
    runAIAndPatch(appId, interactionToken, userId, prompt).catch((e) => {
      console.warn("[discord-interactions] background AI failed:", e?.message);
    });

    return NextResponse.json({ type: REPLY_DEFERRED });
  }

  return NextResponse.json({
    type: REPLY_MESSAGE,
    data: { content: `❓ 未知命令 /${cmd}、傳 /help 看清單` },
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "discord-interactions" });
}
