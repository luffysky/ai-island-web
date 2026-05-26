import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { consumeBindCode } from "@/lib/notify-user-line";
import { buildQuickReply, buildSimpleCard, type FlexMessage, type LineTextMessage } from "@/lib/line-flex";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { buildTutorSystemPrompt } from "@/lib/ai-tutor-prompt";
import { getUserLearningState, formatLearningStateForPrompt } from "@/lib/user-learning-state";
import { checkOwner } from "@/lib/is-owner";

// in-memory fallback：未綁定 user（profile=null）沒法存 DB、暫存 in-memory
type Msg = { role: "user" | "assistant"; content: string };
const userHistoryByUid = new Map<string, Msg[]>();
function getUserHistory(uid: string): Msg[] {
  if (!userHistoryByUid.has(uid)) userHistoryByUid.set(uid, []);
  return userHistoryByUid.get(uid)!;
}

// DB 持久化：已綁定 user 的對話用 ai_conversations + ai_messages
// 同一個 LINE user 同一個 conversation 永久累積（容器重啟也記得、admin 後台可查）
async function getOrCreateLineConversation(profileId: string, modelId: string, displayName: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from("ai_conversations")
    .select("id")
    .eq("user_id", profileId)
    .like("title", "LINE:%")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return (existing as any).id as string;

  const { data: created, error } = await admin
    .from("ai_conversations")
    .insert({
      user_id: profileId,
      title: `LINE: ${displayName}`,
      tone: "casual_tw",
      model_id: modelId,
      use_byok: false,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.warn("[line-webhook-user] create conversation failed:", error?.message);
    return null;
  }
  return (created as any).id as string;
}

async function loadLineConversationHistory(convId: string, limit = 20): Promise<Msg[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as any[] ?? []).map((m) => ({ role: m.role, content: m.content }));
}

async function saveLineConversationTurn(convId: string, userText: string, assistantText: string, modelTag: string) {
  const admin = createSupabaseAdmin();
  await admin.from("ai_messages").insert([
    { conversation_id: convId, role: "user", content: userText },
    { conversation_id: convId, role: "assistant", content: assistantText, model_used: modelTag },
  ]);
  await admin
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);
}

type UserProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  xp: number | null;
  level: number | null;
};

export type AskUserAIResult = { reply: string; displayName: string; ownerMode: boolean };

async function askUserAI(text: string, profile: UserProfileLite | null, lineUserId: string): Promise<AskUserAIResult | null> {
  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true).limit(20);
  const activeModels = (models as any[]) ?? [];
  // 先讀後台「LINE user bot 學員導師」用途的對應、沒設再 fallback
  const usageModel = await pickModelForUsage("line_user", activeModels).catch(() => null);
  const model = usageModel
    ?? activeModels.find((m) => m.provider === "anthropic")
    ?? activeModels[0];
  if (!model) {
    console.warn("[line-webhook-user] no active model in ai_models");
    return null;
  }

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) {
    console.warn(`[line-webhook-user] no enabled api key for provider=${model.provider}`);
    return null;
  }

  let apiKey: string;
  try {
    apiKey = decryptKey((sysKey as any).api_key_encrypted);
  } catch (e: any) {
    console.warn(`[line-webhook-user] decrypt failed for ${model.provider}:`, e?.message);
    return null;
  }

  // 對話歷史：已綁定走 DB（持久化、容器重啟也記得、admin 後台可查）、未綁定 fallback in-memory
  const displayName = profile?.display_name || profile?.username || `LINE 學員${lineUserId.slice(0, 6)}`;
  let convId: string | null = null;
  let hist: Msg[] = [];
  if (profile?.id) {
    convId = await getOrCreateLineConversation(profile.id, model.id, displayName);
    if (convId) {
      hist = await loadLineConversationHistory(convId, 20);
    }
  }
  if (!convId) {
    hist = [...getUserHistory(lineUserId)];
  }
  hist.push({ role: "user", content: text });

  // 灌入網站完整 AI 導師系統提示（含 75 章 DB 摘要 + 學員學習狀態 + owner check）
  // = LINE 學員 bot 跟網站 AI 導師同等能力、能引用任何章節 lesson、認 OWNER_LINE_USER_IDS
  let userContext: string | undefined;
  if (profile?.id) {
    try {
      const learningState = await getUserLearningState(profile.id);
      userContext = learningState ? formatLearningStateForPrompt(learningState) : undefined;
    } catch (e: any) {
      console.warn("[line-webhook-user] getUserLearningState failed:", e?.message);
    }
  }

  const systemPrompt = await buildTutorSystemPrompt({
    tone: "casual_tw",
    userId: profile?.id ?? null,
    userUsername: profile?.username ?? null,
    userRole: profile?.role ?? null,
    userEmail: null,
    userContext,
    lineUserId,
    channel: "line",
  });

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: systemPrompt },
        ...hist.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      maxTokens: 800,
    });
    const reply = r.text?.trim() || "我這邊沒接到回應、再問一次試試？";
    // 持久化：已綁定存 DB、未綁定存 in-memory
    if (convId) {
      saveLineConversationTurn(convId, text, reply, `${model.provider}/${model.model_name}`).catch((e) => {
        console.warn("[line-webhook-user] save conversation failed:", (e as any)?.message);
      });
    } else {
      const mem = getUserHistory(lineUserId);
      mem.push({ role: "user", content: text });
      mem.push({ role: "assistant", content: reply });
      if (mem.length > 16) mem.splice(0, mem.length - 16);
    }
    const ownerMode = checkOwner({
      id: profile?.id ?? null,
      username: profile?.username ?? null,
      role: profile?.role ?? null,
      email: null,
      lineUserId,
    }).isOwner;
    return { reply, displayName, ownerMode };
  } catch (e: any) {
    console.warn("[line-webhook-user] AI failed:", e?.message);
    // 也寫 error_logs (之前只 console.warn、Zeabur log 翻不到)
    try {
      await admin.from("error_logs").insert({
        source: "line-webhook-user",
        level: "error",
        message: `[user_ai_failed] ${e?.message ?? "unknown"}`,
        extra: {
          model: model?.model_name,
          provider: model?.provider,
          line_user_id: lineUserId,
          stack: e?.stack?.slice(0, 1000),
        },
      });
    } catch {}
    return null;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// AI call 偶爾 5-15 秒、預設 10s 會被 kill 導致 silent fail
export const maxDuration = 60;

const ENDPOINT = "https://api.line.me/v2/bot";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function logUserLineError(code: string, message: string, extra: any = {}) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("error_logs").insert({
      source: "line-webhook-user",
      level: "error",
      message: `[${code}] ${message}`,
      extra,
    });
  } catch {}
  console.warn(`[line-webhook-user] ${code}:`, message);
}

// 接 string（純文字）/ FlexMessage / 多則訊息 array；text 自動套 Quick Reply、最多 5 則（LINE 上限）
async function lineReply(
  replyToken: string,
  payload: string | FlexMessage | LineTextMessage | Array<string | FlexMessage | LineTextMessage>,
  token: string,
  quickReply?: any,
) {
  try {
    const rawList = Array.isArray(payload) ? payload : [payload];
    const messages = rawList.slice(0, 5).map((p, idx, arr) => {
      const m: any = typeof p === "string" ? { type: "text", text: p.slice(0, 4900) } : { ...p };
      // Quick Reply 只掛在最後一則（LINE 只認最後一則的 quickReply）
      if (quickReply && idx === arr.length - 1 && !m.quickReply) m.quickReply = quickReply;
      return m;
    });
    const res = await fetch(`${ENDPOINT}/message/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await logUserLineError("reply_api_failed", `LINE reply ${res.status}: ${body.slice(0, 200)}`, {
        status: res.status,
        body: body.slice(0, 500),
        replyToken_prefix: replyToken.slice(0, 12) + "...",
        hint: res.status === 400 && body.includes("Invalid reply token") ? "reply token 過期 / 已用過"
            : res.status === 400 ? "Flex schema 錯（看 body 的 property field）"
            : "看 body",
      });
    }
  } catch (e) {
    await logUserLineError("reply_fetch_failed", (e as any)?.message ?? "unknown", {
      error: String(e).slice(0, 300),
    });
  }
}

// 學員紫色配色（區別 admin 綠 / 黃 / 紅系）
const USER_ACCENT = "#a78bfa";

function cardWelcome(): FlexMessage {
  return buildSimpleCard({
    emoji: "🏝️",
    title: "歡迎加入 AI 島！",
    accentColor: USER_ACCENT,
    body: "綁定帳號後、完課 / 升等 / 成就解鎖 / 論壇被回覆都會推到你的 LINE。",
    meta: [
      { label: "📋 Step 1", value: "去網站拿 6 位 code" },
      { label: "💬 Step 2", value: "傳給我「/bind 123456」" },
    ],
    buttons: [
      { label: "拿綁定 code", uri: `${SITE_URL}/settings`, primary: true },
      { label: "看章節", uri: `${SITE_URL}/chapters` },
    ],
  });
}

function cardBindSuccess(): FlexMessage {
  return buildSimpleCard({
    emoji: "✅",
    title: "綁定成功！",
    accentColor: "#50fa7b",
    body: "之後完成 lesson / 升等 / 解鎖成就 / 論壇被回覆都會推給你。",
    meta: [
      { label: "🔕 想關通知", value: "傳「/unbind」" },
      { label: "⚙️ 細部設定", value: "去網站「設定」頁" },
    ],
    buttons: [
      { label: "去學習", uri: `${SITE_URL}/chapters`, primary: true },
      { label: "設定通知", uri: `${SITE_URL}/settings` },
    ],
  });
}

function cardBindFail(reason: string): FlexMessage {
  return buildSimpleCard({
    emoji: "❌",
    title: "綁定失敗",
    accentColor: "#ff5555",
    body: reason,
    buttons: [
      { label: "重新拿 code", uri: `${SITE_URL}/settings`, primary: true },
    ],
  });
}

function cardUnbind(success: boolean): FlexMessage {
  return success
    ? buildSimpleCard({
        emoji: "🔕",
        title: "已解除綁定",
        accentColor: "#6272a4",
        body: "之後不再推通知。要重綁去網站重拿 code。",
        buttons: [{ label: "重綁", uri: `${SITE_URL}/settings` }],
      })
    : buildSimpleCard({
        emoji: "🤔",
        title: "還沒綁定",
        accentColor: "#6272a4",
        body: "或已經解除過了。要綁去網站拿 code。",
        buttons: [{ label: "拿綁定 code", uri: `${SITE_URL}/settings`, primary: true }],
      });
}

function cardHelp(): FlexMessage {
  return buildSimpleCard({
    emoji: "📖",
    title: "AI 島 LINE bot",
    accentColor: USER_ACCENT,
    body: "我能做的事",
    meta: [
      { label: "💬", value: "聊天問 AI 學員導師（綁定後）" },
      { label: "/bind 123456", value: "綁帳號" },
      { label: "/unbind", value: "解除綁定" },
      { label: "/whoami", value: "看綁定狀態" },
      { label: "/help", value: "看這份" },
    ],
    buttons: [
      { label: "打開網站", uri: SITE_URL, primary: true },
      { label: "設定", uri: `${SITE_URL}/settings` },
    ],
  });
}

function cardWhoami(userId: string, bound: any | null): FlexMessage {
  if (bound) {
    return buildSimpleCard({
      emoji: "🆔",
      title: "已綁定",
      accentColor: "#50fa7b",
      body: "你的 LINE 已綁到此 AI 島帳號。",
      meta: [
        { label: "username", value: String(bound.username ?? "(未設)") },
        { label: "名稱", value: String(bound.display_name ?? "(未設)") },
        { label: "角色", value: String(bound.role ?? "user") },
        { label: "LINE userId", value: userId.slice(0, 12) + "..." },
      ],
      buttons: [{ label: "去學習", uri: `${SITE_URL}/chapters`, primary: true }],
    });
  }
  return buildSimpleCard({
    emoji: "🆔",
    title: "未綁定",
    accentColor: "#ffb86c",
    body: "DB 找不到綁過的帳號。可能你以為綁了但 DB 沒寫成功。",
    meta: [
      { label: "LINE userId", value: userId.slice(0, 12) + "..." },
      { label: "正解", value: "去設定拿 code、傳 /bind XXXXXX" },
    ],
    buttons: [{ label: "拿綁定 code", uri: `${SITE_URL}/settings`, primary: true }],
  });
}

function cardUnbound(userId: string): FlexMessage {
  return buildSimpleCard({
    emoji: "🤖",
    title: "嗨～看到你訊息了",
    accentColor: USER_ACCENT,
    body: "你目前沒綁定 AI 島帳號、所以還不能用 AI 學員導師。",
    meta: [
      { label: "Step 1", value: "登入網站" },
      { label: "Step 2", value: "去「設定」拿 6 位 code" },
      { label: "Step 3", value: "回來傳「/bind 123456」" },
    ],
    buttons: [
      { label: "去拿 code", uri: `${SITE_URL}/settings`, primary: true },
      { label: "登入", uri: `${SITE_URL}/login` },
    ],
  });
}

function cardBindHint(): FlexMessage {
  return buildSimpleCard({
    emoji: "🔗",
    title: "怎麼綁定 AI 島",
    accentColor: USER_ACCENT,
    body: "4 步搞定、之後能用 AI 導師 + 收學習通知。",
    meta: [
      { label: "1", value: "登入網站" },
      { label: "2", value: "進「設定」" },
      { label: "3", value: "按「LINE 通知綁定」拿 6 位 code" },
      { label: "4", value: "回來傳「/bind 123456」" },
    ],
    buttons: [
      { label: "去拿 code", uri: `${SITE_URL}/settings`, primary: true },
      { label: "登入", uri: `${SITE_URL}/login` },
    ],
  });
}

const QUICK_REPLY = buildQuickReply([
  { type: "uri", label: "🌐 打開網站", uri: SITE_URL },
  { type: "uri", label: "📚 看章節", uri: `${SITE_URL}/chapters` },
  { type: "uri", label: "⚙️ 設定", uri: `${SITE_URL}/settings` },
  { type: "message", label: "❓ 說明", text: "/help" },
]);

// AI 學員導師回覆美化卡 — 短回答（< 220 字、無 code）整段包進 Flex bubble、長回答跟一張小卡 footer
// header 紫色 "🤖 AI 學員導師 · 雪鑰"、footer 3 個按鈕
function cardAITutorReply(opts: { reply: string; displayName: string; ownerMode: boolean }): FlexMessage {
  const headerColor = opts.ownerMode ? "#ffd700" : USER_ACCENT; // 林董金色、學員紫色
  const headerLabel = opts.ownerMode ? "🤖 雪鑰 · 給林董" : "🤖 AI 學員導師 · 雪鑰";
  return buildSimpleCard({
    emoji: "🎓",
    title: headerLabel,
    accentColor: headerColor,
    body: opts.reply.slice(0, 1900), // Flex text 上限保守抓 1900
    meta: [{ label: "👤 對象", value: opts.displayName }],
    buttons: [
      { label: "📚 看章節", uri: `${SITE_URL}/chapters`, primary: true },
      { label: "🌐 完整對話", uri: `${SITE_URL}/ai-tutor` },
    ],
  });
}

// 長回答 / 含 code → 純文字 + 一張小 footer 卡（不打斷對話 readability）
function cardAITutorFooter(opts: { displayName: string; ownerMode: boolean }): FlexMessage {
  const headerColor = opts.ownerMode ? "#ffd700" : USER_ACCENT;
  return buildSimpleCard({
    emoji: opts.ownerMode ? "👑" : "🎓",
    title: opts.ownerMode ? "雪鑰回給林董" : "AI 學員導師 · 雪鑰",
    accentColor: headerColor,
    body: "想問下一題？或到網站看完整內容",
    meta: [{ label: "👤", value: opts.displayName }],
    buttons: [
      { label: "📚 看章節", uri: `${SITE_URL}/chapters`, primary: true },
      { label: "🌐 完整對話", uri: `${SITE_URL}/ai-tutor` },
      { label: "⚙️ 設定", uri: `${SITE_URL}/settings` },
    ],
  });
}

// 把 AI reply 包成美化訊息：短的 → Flex 一張、長/含 code → 純文字 + Flex footer
function buildAITutorMessages(reply: string, displayName: string, ownerMode: boolean): Array<FlexMessage | LineTextMessage> {
  const hasCode = /```/.test(reply);
  const isShort = reply.length <= 220 && !hasCode;
  if (isShort) {
    return [cardAITutorReply({ reply, displayName, ownerMode })];
  }
  return [
    { type: "text", text: reply.slice(0, 4900) } as LineTextMessage,
    cardAITutorFooter({ displayName, ownerMode }),
  ];
}

/**
 * USER LINE bot webhook
 *
 * 跟 admin bot 分離（不同 channel、不同 token）。
 * 給一般使用者加為好友、處理：
 *   - 綁定（/bind <code>）
 *   - 解綁（/unbind）
 *   - 一般訊息 → 友善導引到網站
 *
 * 環境變數：
 *   USER_LINE_CHANNEL_SECRET  — verify signature
 *   USER_LINE_CHANNEL_TOKEN   — reply / push
 *
 * 設定 LINE Developer Console：
 *   Webhook URL = https://<site>/api/line-webhook-user
 */
export async function POST(req: NextRequest) {
  const secret = process.env.USER_LINE_CHANNEL_SECRET;
  const token = process.env.USER_LINE_CHANNEL_TOKEN;
  if (!secret || !token) {
    console.warn("[line-webhook:user] no_env");
    return NextResponse.json({ ok: false, error: "no_user_bot_env" });
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("x-line-signature");
  const sigOk = verifySignature(raw, sigHeader, secret);

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  console.log(`[line-webhook:user] sig_received=${sigHeader?.slice(0,12)}... expected=${expected.slice(0,12)}... ok=${sigOk} body_len=${raw.length}`);

  if (!sigOk) {
    try {
      const admin = createSupabaseAdmin();
      await admin.from("error_logs").insert({
        source: "line-webhook-user",
        level: "error",
        message: "[invalid_signature] webhook 簽章驗失敗、USER_LINE_CHANNEL_SECRET 對不上",
        extra: {
          received_sig_prefix: sigHeader?.slice(0, 16) ?? null,
          expected_sig_prefix: expected.slice(0, 16),
          body_len: raw.length,
          secret_length: secret.length,
          hint: "LINE Console → user channel → Channel secret 整段對 Zeabur env USER_LINE_CHANNEL_SECRET",
        },
      });
    } catch {}
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  for (const ev of body.events ?? []) {
    const replyToken = ev.replyToken;
    const userId = ev.source?.userId as string | undefined;

    if (ev.type === "follow" && replyToken && userId) {
      await lineReply(replyToken, cardWelcome(), token, QUICK_REPLY);
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text" && replyToken && userId) {
      const text = String(ev.message.text ?? "").trim();

      // 1. 綁定
      const bindMatch = text.match(/^\/?bind\s+(\d{6})$/i);
      if (bindMatch) {
        const result = await consumeBindCode(bindMatch[1], userId);
        if (result.ok) {
          await lineReply(replyToken, cardBindSuccess(), token, QUICK_REPLY);
        } else {
          const reasonMap: Record<string, string> = {
            invalid_format: "code 格式不對、應該是 6 位數字",
            code_not_found: "code 找不到、可能輸入錯或過期",
            code_expired: "code 過期了、請到網站重拿（5 分鐘有效）",
            line_already_bound_to_another: "這個 LINE 已綁過別的帳號、先到網站解除原綁定",
          };
          await lineReply(replyToken, cardBindFail(reasonMap[result.reason ?? ""] ?? result.reason ?? "未知錯誤"), token, QUICK_REPLY);
        }
        continue;
      }

      // 2. 解綁
      if (text === "/unbind" || text === "解除" || text === "解除綁定") {
        const admin = createSupabaseAdmin();
        const { error, count } = await admin
          .from("profiles")
          .update({
            line_user_id: null,
            line_bound_at: null,
            line_notify_enabled: false,
          }, { count: "exact" })
          .eq("line_user_id", userId);
        await lineReply(replyToken, cardUnbind(!(error || !count)), token, QUICK_REPLY);
        continue;
      }

      // 3. /help
      if (text === "/help" || text === "help" || text === "說明" || text === "?") {
        await lineReply(replyToken, cardHelp(), token, QUICK_REPLY);
        continue;
      }

      // 3.4. /whoami — debug 用、回 LINE userId + 綁定狀態
      if (text === "/whoami" || text === "我是誰" || text === "whoami") {
        const admin = createSupabaseAdmin();
        const { data: bound } = await admin
          .from("profiles")
          .select("username, display_name, role")
          .eq("line_user_id", userId)
          .maybeSingle();
        await lineReply(replyToken, cardWhoami(userId, bound), token, QUICK_REPLY);
        continue;
      }

      // 3.5. 綁定 / 登入 自然語言引導
      const bindHints = ["綁定", "我要綁", "我要登入", "登入", "怎麼綁", "怎麼登入", "綁帳號", "綁帳戶", "bind", "login", "register", "註冊"];
      if (bindHints.some((k) => text.toLowerCase().includes(k.toLowerCase()))) {
        await lineReply(replyToken, cardBindHint(), token, QUICK_REPLY);
        continue;
      }

      // 4. 其他訊息 — 已綁定 user 走 AI 學員導師、未綁定提示綁定
      const admin = createSupabaseAdmin();

      // 看 LINE userId 對應哪個 profile（若已綁定）
      // ⚠️ profiles 表沒 email 欄位、不能 select 進來 (否則 Supabase 拒回、data=null、所有人被誤判為未綁定)
      const { data: profile } = await admin
        .from("profiles")
        .select("id, username, display_name, role, xp, level")
        .eq("line_user_id", userId)
        .maybeSingle();

      const senderName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        `LINE訪客${userId.slice(0, 6)}`;

      // 已綁定 → 試 AI、AI 通了就回、AI 失敗 / 未綁定才走 ticket
      if (profile) {
        const aiResult = await askUserAI(text, profile as any, userId);
        if (aiResult) {
          const msgs = buildAITutorMessages(aiResult.reply, aiResult.displayName, aiResult.ownerMode);
          await lineReply(replyToken, msgs, token, QUICK_REPLY);
          continue;
        }
        // AI 失敗、fallback 到 ticket
      } else {
        // 未綁定提示綁定
        await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
        continue;
      }

      // 寫進 tickets 表
      const { data: ticket, error: ticketErr } = await admin
        .from("tickets")
        .insert({
          user_id: (profile as any)?.id ?? null,
          subject: `LINE 訊息：${text.slice(0, 40)}`,
          category: "support",
          priority: "normal",
          status: "open",
          meta: {
            source: "user_line_bot",
            line_user_id: userId,
            sender_name: senderName,
          },
        })
        .select("id")
        .single();

      if (ticketErr) {
        console.error("[line-webhook-user] ticket insert failed:", ticketErr.message);
        try {
          await admin.from("error_logs").insert({
            source: "line-webhook-user",
            level: "error",
            message: `ticket insert failed: ${ticketErr.message}`,
            extra: { line_user_id: userId, text: text.slice(0, 200) },
          });
        } catch {}
      }

      // ticket_messages 寫一筆
      if (ticket?.id) {
        const { error: msgErr } = await admin.from("ticket_messages").insert({
          ticket_id: ticket.id,
          author_type: "user",
          author_id: (profile as any)?.id ?? null,
          sender_type: "user",
          sender_id: (profile as any)?.id ?? null,
          body: text.slice(0, 4000),
          content: text.slice(0, 4000),
          is_staff: false,
          meta: { source: "line_user_bot", line_user_id: userId },
        });
        if (msgErr) {
          console.error("[line-webhook-user] ticket_messages insert failed:", msgErr.message);
          try {
            await admin.from("error_logs").insert({
              source: "line-webhook-user",
              level: "error",
              message: `ticket_messages insert failed: ${msgErr.message}`,
              extra: { ticket_id: ticket.id, line_user_id: userId },
            });
          } catch {}
        }
      }

      // 通知 admin LINE
      const { notifyAdmin } = await import("@/lib/notify-admin");
      notifyAdmin({
        kind: "user_ticket",
        dedupeKey: `ticket:${ticket?.id ?? userId}:${Date.now()}`,
        text: `💌 ${senderName} 透過 LINE 提問：\n「${text.slice(0, 200)}」\n\n回覆：${SITE_URL}/${process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2"}/admin/crm${ticket?.id ? `/${ticket.id}` : ""}`,
      }).catch(() => {});

      // 回 user：已收到
      await lineReply(
        replyToken,
        `📩 已收到你的訊息、admin 會在 24 小時內回覆～\n\n（系統自動建 ticket #${ticket?.id?.toString().slice(0, 8) ?? "-"}、回覆會推到這個 LINE 對話）\n\n想自助：\n• 綁帳號：「/bind 123456」\n• 看說明：「/help」`,
        token, QUICK_REPLY,
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook-user" });
}
