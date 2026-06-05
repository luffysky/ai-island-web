import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { consumeBindCode } from "@/lib/notify-user-line";
import { buildQuickReply, buildSimpleCard, buildListCard, type FlexMessage, type LineTextMessage } from "@/lib/line-flex";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { buildTutorSystemPrompt } from "@/lib/ai-tutor-prompt";
import { getUserLearningState, formatLearningStateForPrompt } from "@/lib/user-learning-state";
import { checkOwner } from "@/lib/is-owner";
import { askStudentAIWithTools } from "@/lib/line-user-ai-tools";

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

/**
 * @returns 寫好的 assistant message id（給 LINE Quick Reply「📝 存筆記」按鈕用、postback data 帶 msg_id）
 */
async function saveLineConversationTurn(convId: string, userText: string, assistantText: string, modelTag: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  // user message 寫一筆
  await admin.from("ai_messages").insert({ conversation_id: convId, role: "user", content: userText });
  // assistant 寫一筆並取回 id
  const { data: assistantRow } = await admin
    .from("ai_messages")
    .insert({ conversation_id: convId, role: "assistant", content: assistantText, model_used: modelTag })
    .select("id")
    .single();
  await admin
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);
  return (assistantRow as any)?.id ?? null;
}

type UserProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  xp: number | null;
  level: number | null;
};

export type AskUserAIResult = {
  reply: string;
  displayName: string;
  ownerMode: boolean;
  /** ai_messages.id（assistant message）— 用來給 Quick Reply 「📝 存筆記」postback 帶 */
  assistantMsgId?: string | null;
};

const ASK_USER_AI_TIMEOUT_MS = 25_000;

import { fetchLineImageBase64, type ImagePart } from "@/lib/line-image";

async function askUserAI(
  text: string,
  profile: UserProfileLite | null,
  lineUserId: string,
  images?: ImagePart[],
): Promise<AskUserAIResult | null> {
  // 整體硬 timeout：LINE reply token 有 30 秒、跑超過會永遠送不出 reply、學員乾等
  // 用 race 包住整個流程、超時就回兜底訊息、保證一定能 reply
  return Promise.race([
    askUserAIInner(text, profile, lineUserId, images),
    new Promise<AskUserAIResult>((resolve) =>
      setTimeout(() => {
        const displayName = profile?.display_name || profile?.username || "你";
        resolve({
          reply: `${displayName}、我這邊思考太久、訊號可能不穩、再傳一次試試？`,
          displayName,
          ownerMode: false,
          assistantMsgId: null,
        });
      }, ASK_USER_AI_TIMEOUT_MS),
    ),
  ]);
}

async function askUserAIInner(text: string, profile: UserProfileLite | null, lineUserId: string, images?: ImagePart[]): Promise<AskUserAIResult | null> {
  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true).limit(20);
  const activeModels = (models as any[]) ?? [];
  if (!activeModels.length) {
    console.warn("[line-webhook-user] no active model in ai_models");
    try {
      await admin.from("error_logs").insert({
        source: "line-webhook-user", level: "error",
        message: "[user_ai_null] no active model in ai_models",
        extra: { line_user_id: lineUserId },
      });
    } catch {}
    return null;
  }

  // 身分判定：
  // - isAdminId（owner / admin / editor）→ 在學員 LINE 也「直接用最高階模型」、不必先設 line_user_vip
  // - privileged（再加上付費 Premium）→ 可走 line_user_vip 用途對應的強模型
  const isAdminId = checkOwner({
    id: profile?.id ?? null,
    username: profile?.username ?? null,
    role: profile?.role ?? null,
    email: null,
    lineUserId,
  }).isOwner || ["owner", "admin", "editor"].includes(String((profile as any)?.role ?? ""));
  let privileged = isAdminId;
  if (!privileged && profile?.id) {
    try {
      const { data: premiumOk } = await admin.rpc("has_active_subscription", { p_user_id: profile.id });
      privileged = !!premiumOk;
    } catch {}
  }

  // 模型「強度」估算（admin 身分直接挑最強的先試）
  const strength = (m: any) => {
    const n = String(m?.model_name ?? "").toLowerCase();
    if (/opus/.test(n)) return 6;
    if (/sonnet/.test(n)) return 5;
    if (/gpt-4\.1|gpt-4o(?!-mini)|^o[134]\b/.test(n)) return 5;
    if (/haiku/.test(n)) return 3;
    if (/mini|flash|lite|nano|8b/.test(n)) return 1;
    return 4;
  };

  const vipModel = privileged ? await pickModelForUsage("line_user_vip", activeModels).catch(() => null) : null;
  const baseModel = await pickModelForUsage("line_user", activeModels).catch(() => null);

  // 候選順序（之後依序找「金鑰有啟用且能解密」的第一個、任一家通就用、別輕易投降）：
  let ordered: any[];
  if (isAdminId) {
    // admin 身分：line_user_vip 明設的擺最前、其餘按模型強度降序（Opus→Sonnet→…）、anthropic 同分優先（有 tool）
    const pinned = vipModel ? [vipModel] : [];
    const rest = activeModels
      .filter((m) => !pinned.some((p) => p.id === m.id))
      .sort((a, b) => strength(b) - strength(a) || (a.provider === "anthropic" ? -1 : 1));
    ordered = [...pinned, ...rest];
  } else {
    // 一般 / Premium：vip（privileged 且有設）→ line_user → anthropic → 其餘
    ordered = [
      ...(vipModel ? [vipModel] : []),
      ...(baseModel ? [baseModel] : []),
      ...activeModels.filter((m) => m.provider === "anthropic"),
      ...activeModels,
    ];
  }
  ordered = ordered.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  let model: any = null;
  let apiKey: string | null = null;
  const keyProblems: string[] = [];
  for (const cand of ordered) {
    const { data: sk } = await admin
      .from("ai_api_keys")
      .select("api_key_encrypted, enabled")
      .eq("provider", cand.provider)
      .maybeSingle();
    if (!sk || !(sk as any).enabled) { keyProblems.push(`${cand.provider}:no_enabled_key`); continue; }
    try { apiKey = decryptKey((sk as any).api_key_encrypted); model = cand; break; }
    catch { keyProblems.push(`${cand.provider}:decrypt_fail`); }
  }
  if (!model || !apiKey) {
    console.warn("[line-webhook-user] no usable model+key:", keyProblems.join(", "));
    try {
      await admin.from("error_logs").insert({
        source: "line-webhook-user", level: "error",
        message: `[user_ai_null] no usable model+key (${keyProblems.join(", ") || "none"})`,
        extra: { line_user_id: lineUserId, tried: ordered.map((m) => `${m.provider}/${m.model_name}`) },
      });
    } catch {}
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

  // 把學員自己在網站寫的筆記帶進 context（任何 model 都讀得到、不依賴 tool use）
  if (profile?.id) {
    try {
      const { data: noteRows } = await admin
        .from("notes")
        .select("content, chapter_id, lesson_id, updated_at")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      const notes = (noteRows as any[]) ?? [];
      const notesText = notes
        .map((n) => {
          const loc = n.lesson_id ? `L${n.lesson_id}` : n.chapter_id ? `Ch${n.chapter_id}` : "";
          const body = String(n.content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 250);
          return body ? `- ${loc ? `[${loc}] ` : ""}${body}` : "";
        })
        .filter(Boolean)
        .join("\n");
      if (notesText) {
        userContext = `${userContext ? userContext + "\n\n" : ""}## 這位學員自己在網站寫的筆記（最近 ${notes.length} 則、可直接引用來回答「我的筆記」之類問題）\n${notesText}`;
      }
    } catch (e: any) {
      console.warn("[line-webhook-user] load notes failed:", e?.message);
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
    modelProvider: model.provider,
    modelName: model.model_name,
  });

  try {
    // Anthropic（Claude）支援 tool use — 給學員 AI 4 個讀網站內容的 tool
    // 其他 provider（openai / google / groq）暫無 tool use、退回純對話
    // 含圖片時強制走 callAI（vision 不走 tool use loop）
    let reply: string;
    const hasImages = images && images.length > 0;
    if (!hasImages && model.provider === "anthropic" && /claude/i.test(model.model_name)) {
      reply = await askStudentAIWithTools({
        apiKey,
        model: model.model_name,
        systemPrompt,
        userId: profile?.id ?? null,
        history: hist,
      });
      reply = reply.trim() || "我這邊沒接到回應、再問一次試試？";
    } else {
      // multimodal: 最後一條 user message 改成 [text + images] 結構
      const historyMsgs = hist.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const lastUserContent = hasImages
        ? [
            { type: "text" as const, text: text || "幫我看這張圖、有什麼問題或要學的？" },
            ...images!.map((img) => ({ type: "image" as const, mediaType: img.mediaType, data: img.data })),
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
        maxTokens: 800,
      });
      reply = r.text?.trim() || "我這邊沒接到回應、再問一次試試？";
    }
    // 持久化：已綁定存 DB（並取回 assistant message id 給 Quick Reply 用）、未綁定存 in-memory
    let assistantMsgId: string | null = null;
    if (convId) {
      assistantMsgId = await saveLineConversationTurn(convId, text, reply, `${model.provider}/${model.model_name}`).catch((e) => {
        console.warn("[line-webhook-user] save conversation failed:", (e as any)?.message);
        return null;
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
    return { reply, displayName, ownerMode, assistantMsgId };
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

/**
 * 觸發 LINE「正在輸入」動畫、學員看到不會以為 bot 死了。
 * fire-and-forget、不 await、不影響主流程。
 * loadingSeconds 5–60、官方上限 60、之後自然消失。
 */
function lineLoadingStart(userId: string, token: string, seconds = 60) {
  void fetch(`${ENDPOINT}/chat/loading/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: userId, loadingSeconds: Math.max(5, Math.min(60, seconds)) }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
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
    body: "我能做的事（綁定後解鎖全部）",
    meta: [
      { label: "💬", value: "聊天問 AI 學員導師" },
      { label: "/today", value: "今日學習狀況" },
      { label: "/streak", value: "看連續簽到" },
      { label: "/weak", value: "找弱項章節（quiz<60）" },
      { label: "/recommend", value: "推薦下一課（弱項 + 進度）" },
      { label: "/goal N", value: "設今日目標 N 個 lesson" },
      { label: "/goal", value: "看今日目標達成度" },
      { label: "/quote", value: "每日金句（程式 / 工程 / 創業）" },
      { label: "/support 內容", value: "找真人 admin、建 ticket" },
      { label: "/lesson 關鍵字", value: "找特定 lesson" },
      { label: "/explain 概念", value: "AI 一句話解釋" },
      { label: "/note 內容", value: "存筆記到網站" },
      { label: "/footprint", value: "看 14 天足跡" },
      { label: "/bind 123456", value: "綁帳號" },
      { label: "/unbind", value: "解除綁定" },
      { label: "/whoami", value: "看綁定狀態" },
      { label: "/help", value: "看這份" },
    ],
    buttons: [
      { label: "🛤️ 我的足跡", uri: `${SITE_URL}/me/footprint`, primary: true },
      { label: "📓 我的筆記", uri: `${SITE_URL}/me/notes` },
      { label: "📚 看章節", uri: `${SITE_URL}/chapters` },
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

/**
 * 未綁定鎖頭卡 — 訴求明確 + 引導動作
 * 林董：「LINE 上鎖有通知跟功能」
 */
function cardUnbound(userId: string, feature: string = "AI 學員導師"): FlexMessage {
  return buildSimpleCard({
    emoji: "🔒",
    title: `綁定後解鎖：${feature}`,
    accentColor: "#f59e0b",  // 警示橘
    body: "你目前沒綁定 AI 島帳號、進階功能還沒解鎖。3 步綁好馬上能用👇",
    meta: [
      { label: "🔓 解鎖", value: "AI 對話 / 看圖 / 推播 / 完整足跡" },
      { label: "1️⃣", value: "登入網站" },
      { label: "2️⃣", value: "「設定」拿 6 位 code" },
      { label: "3️⃣", value: "回來傳「/bind 123456」" },
    ],
    buttons: [
      { label: "🔗 立即綁定", uri: `${SITE_URL}/settings`, primary: true },
      { label: "登入", uri: `${SITE_URL}/login` },
    ],
  });
}

/**
 * 高階功能未綁定鎖（語音 / 圖片 / 完整對話歷史）
 * 用紅色強調「這項真的需要綁」
 */
function cardLockedFeature(feature: string, why: string): FlexMessage {
  return buildSimpleCard({
    emoji: "🔒",
    title: `${feature} 需先綁定`,
    accentColor: "#ef4444",
    body: why,
    meta: [
      { label: "🔓 綁定後", value: "立刻解鎖此功能" },
      { label: "1️⃣", value: "登入網站" },
      { label: "2️⃣", value: "「設定」拿 code" },
      { label: "3️⃣", value: "傳「/bind 123456」" },
    ],
    buttons: [
      { label: "🔗 去綁定", uri: `${SITE_URL}/settings`, primary: true },
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
  { type: "message", label: "📓 我的筆記", text: "我的筆記" },
  { type: "uri", label: "🌐 打開網站", uri: SITE_URL },
  { type: "uri", label: "📚 看章節", uri: `${SITE_URL}/chapters` },
  { type: "message", label: "❓ 說明", text: "/help" },
]);

/**
 * 給 AI 學員導師回覆專用的 Quick Reply — 第一顆按鈕是「📝 存筆記」postback
 * msgId 是 ai_messages.id（UUID 36 字、塞在 postback data 內）
 */
function buildNoteQuickReply(msgId: string) {
  return buildQuickReply([
    { type: "postback", label: "📝 存筆記", data: `action=save_note&msg_id=${msgId}`, displayText: "已存進網站筆記本 ✅" } as any,
    { type: "message", label: "🛤️ 我的足跡", text: "/footprint" },
    { type: "uri", label: "📚 看章節", uri: `${SITE_URL}/chapters` },
    { type: "message", label: "❓ 說明", text: "/help" },
  ]);
}

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
      { label: "💬 對話歷史", uri: `${SITE_URL}/me/ai-history` },
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
      { label: "💬 對話歷史", uri: `${SITE_URL}/me/ai-history` },
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

    // Postback — Quick Reply 「📝 存筆記」按鈕觸發
    if (ev.type === "postback" && replyToken && userId) {
      const data = String(ev.postback?.data ?? "");
      const params = new URLSearchParams(data);
      const action = params.get("action");

      if (action === "save_note") {
        const msgId = params.get("msg_id");
        if (!msgId) {
          await lineReply(replyToken, "❌ 缺少訊息 id、再試一次", token, QUICK_REPLY);
          continue;
        }
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        // 撈該則 ai_messages 內容
        const { data: msg } = await admin
          .from("ai_messages")
          .select("content")
          .eq("id", msgId)
          .maybeSingle();
        if (!msg || !(msg as any).content) {
          await lineReply(replyToken, "❌ 找不到原訊息、可能太舊了", token, QUICK_REPLY);
          continue;
        }
        const content = String((msg as any).content).slice(0, 4000);
        const { error: noteErr } = await admin.from("notes").insert({
          user_id: (profile as any).id,
          chapter_id: null,
          lesson_id: null,
          content,
          is_public: false,
        });
        if (noteErr) {
          await lineReply(
            replyToken,
            buildSimpleCard({
              emoji: "❌",
              title: "存筆記失敗",
              accentColor: "#ef4444",
              body: noteErr.message,
              buttons: [{ label: "📓 到網站手動加", uri: `${SITE_URL}/me/notes`, primary: true }],
            }),
            token,
            QUICK_REPLY,
          );
          continue;
        }
        await lineReply(
          replyToken,
          buildSimpleCard({
            emoji: "📝",
            title: "AI 回覆已存進筆記",
            accentColor: USER_ACCENT,
            body: content.length > 240 ? content.slice(0, 240) + "…" : content,
            meta: [{ label: "字數", value: `${content.length} 字` }],
            buttons: [
              { label: "📓 看所有筆記", uri: `${SITE_URL}/me/notes`, primary: true },
              { label: "🛤️ 我的足跡", uri: `${SITE_URL}/me/footprint` },
            ],
          }),
          token,
          QUICK_REPLY,
        );
        continue;
      }
      // 未知 postback action — 忽略
      console.warn("[line-webhook-user] unknown postback:", data);
      continue;
    }

    // 圖片訊息 — 學員傳截圖卡關問題、AI 直接看圖回
    if (ev.type === "message" && ev.message?.type === "image" && replyToken && userId) {
      lineLoadingStart(userId, token, 60);
      const admin = createSupabaseAdmin();
      const { data: profile } = await admin
        .from("profiles")
        .select("id, username, display_name, role, xp, level")
        .eq("line_user_id", userId)
        .maybeSingle();
      // 🔒 未綁定不開放圖片 vision（成本敏感、防匿名濫用）
      if (!profile) {
        await lineReply(
          replyToken,
          cardLockedFeature("📷 AI 看圖", "圖片分析會用 AI 看圖、需要先綁定帳號。"),
          token,
          QUICK_REPLY,
        );
        continue;
      }
      const img = await fetchLineImageBase64(ev.message.id, token);
      if (!img) {
        await lineReply(replyToken, "圖片下載失敗、再傳一次試試？", token, QUICK_REPLY);
        continue;
      }
      const result = await askUserAI("", profile as any, userId, [img]);
      if (!result) {
        await lineReply(replyToken, "AI 暫時無法分析、稍後再試或描述一下圖片內容讓我幫忙。", token, QUICK_REPLY);
        continue;
      }
      await lineReply(replyToken, result.reply.slice(0, 4900), token, QUICK_REPLY);
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text" && replyToken && userId) {
      const text = String(ev.message.text ?? "").trim();
      // 立刻送 LINE「正在輸入」60s 動畫、學員看到不會以為 bot 卡死
      // fire-and-forget、不阻塞後續處理
      lineLoadingStart(userId, token, 60);

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

      // 3.405. 看我的筆記內容 —— 直接在 LINE 顯示自己在網站寫的筆記
      if (["我的筆記", "/筆記", "/notes", "看筆記", "看我的筆記", "筆記", "我的筆記內容", "查筆記"].includes(text)) {
        const admin = createSupabaseAdmin();
        const { data: prof } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!prof) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const { data: noteRows } = await admin
          .from("notes")
          .select("content, chapter_id, lesson_id, updated_at")
          .eq("user_id", (prof as any).id)
          .order("updated_at", { ascending: false })
          .limit(10);
        const myNotes = (noteRows as any[]) ?? [];
        if (myNotes.length === 0) {
          await lineReply(
            replyToken,
            buildSimpleCard({
              emoji: "📭",
              title: "還沒有筆記",
              accentColor: "#7a5599",
              body: "你還沒在網站寫筆記。上課時點筆記按鈕、或在這裡打「/note 內容」就能存。",
              buttons: [{ label: "🌐 去寫筆記", uri: `${SITE_URL}/me/notes`, primary: true }],
            }),
            token,
            QUICK_REPLY,
          );
          continue;
        }
        const items = myNotes.map((n) => {
          const loc = n.lesson_id ? `📍 L${n.lesson_id}` : n.chapter_id ? `📍 Ch${n.chapter_id}` : "📝 自由筆記";
          const body = String(n.content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "（空白）";
          const date = new Date(n.updated_at).toLocaleDateString("zh-TW");
          return { primary: body, secondary: `${loc} · ${date}` };
        });
        await lineReply(
          replyToken,
          buildListCard({
            emoji: "📓",
            title: `我的筆記（${myNotes.length} 則）`,
            accentColor: "#7a5599",
            items,
            footerButton: { label: "看完整 / 編輯", uri: `${SITE_URL}/me/notes` },
          }),
          token,
          QUICK_REPLY,
        );
        continue;
      }

      // 3.41. /note 命令式存筆記
      // 支援：「/note 內容」「存筆記 內容」「筆記 內容」
      const noteMatch =
        text.match(/^\/note\s+([\s\S]+)/i) ||
        text.match(/^存筆記\s+([\s\S]+)/) ||
        text.match(/^筆記\s+([\s\S]+)/);
      if (noteMatch) {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id, display_name, username")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const content = noteMatch[1].trim().slice(0, 4000);
        const { error: noteErr } = await admin.from("notes").insert({
          user_id: (profile as any).id,
          chapter_id: null,
          lesson_id: null,
          content,
          is_public: false,
        });
        if (noteErr) {
          await lineReply(
            replyToken,
            buildSimpleCard({
              emoji: "❌",
              title: "存筆記失敗",
              accentColor: "#ef4444",
              body: noteErr.message,
              buttons: [{ label: "🌐 到網站手動加", uri: `${SITE_URL}/me/notes`, primary: true }],
            }),
            token,
            QUICK_REPLY,
          );
          continue;
        }
        await lineReply(
          replyToken,
          buildSimpleCard({
            emoji: "📝",
            title: "已存進筆記本",
            accentColor: USER_ACCENT,
            body: content.length > 200 ? content.slice(0, 200) + "…" : content,
            meta: [{ label: "字數", value: `${content.length} 字` }],
            buttons: [
              { label: "📓 看筆記", uri: `${SITE_URL}/me/notes`, primary: true },
              { label: "🛤️ 我的足跡", uri: `${SITE_URL}/me/footprint` },
            ],
          }),
          token,
          QUICK_REPLY,
        );
        continue;
      }

      // 3.42. /footprint /history /足跡 — 最近 14 天學習足跡
      if (
        text === "/footprint" ||
        text === "/history" ||
        text === "/足跡" ||
        text === "足跡" ||
        text === "我的足跡"
      ) {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id, display_name, username")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const since = new Date(Date.now() - 14 * 86400_000).toISOString();
        const { data: events } = await admin
          .from("learning_events")
          .select("created_at, event_type, chapter_id, lesson_id")
          .eq("user_id", (profile as any).id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50);
        const rows = (events as any[]) ?? [];
        if (rows.length === 0) {
          await lineReply(
            replyToken,
            buildSimpleCard({
              emoji: "🛤️",
              title: "最近 14 天還沒紀錄",
              accentColor: USER_ACCENT,
              body: "去網站開始第一課、學習足跡會自動記下來。",
              buttons: [{ label: "📚 看章節地圖", uri: `${SITE_URL}/chapters`, primary: true }],
            }),
            token,
            QUICK_REPLY,
          );
          continue;
        }
        // 按日期分組
        const byDay = new Map<string, string[]>();
        for (const r of rows) {
          const day = new Date(r.created_at).toLocaleDateString("zh-TW", {
            timeZone: "Asia/Taipei",
            month: "2-digit",
            day: "2-digit",
          });
          if (!byDay.has(day)) byDay.set(day, []);
          if (r.lesson_id) byDay.get(day)!.push(`${r.event_type === "lesson_complete" ? "✅" : "📖"} ${r.lesson_id}`);
          else if (r.chapter_id) byDay.get(day)!.push(`📂 Ch${r.chapter_id}`);
        }
        const days = Array.from(byDay.entries()).slice(0, 10);
        const bodyLines: string[] = [];
        for (const [day, items] of days) {
          bodyLines.push(`📅 ${day}（${items.length} 件）`);
          for (const item of items.slice(0, 3)) bodyLines.push(`  ${item}`);
          if (items.length > 3) bodyLines.push(`  …+${items.length - 3} 件`);
        }
        await lineReply(
          replyToken,
          buildSimpleCard({
            emoji: "🛤️",
            title: "最近 14 天學習足跡",
            accentColor: USER_ACCENT,
            body: bodyLines.join("\n").slice(0, 1900),
            meta: [
              { label: "天數", value: `${days.length} 天` },
              { label: "事件", value: `${rows.length} 件` },
            ],
            buttons: [
              { label: "🛤️ 看完整足跡", uri: `${SITE_URL}/me/footprint`, primary: true },
              { label: "📚 看章節", uri: `${SITE_URL}/chapters` },
            ],
          }),
          token,
          QUICK_REPLY,
        );
        continue;
      }

      // 3.43. /today — 今日學習狀況
      if (text === "/today" || text === "今日" || text === "今日學習") {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id, display_name, username")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const sinceISO = startOfDay.toISOString();
        const todayDate = sinceISO.slice(0, 10);
        const [lessonsRes, quizRes, checkinRes] = await Promise.all([
          admin.from("lesson_progress").select("lesson_id, chapter_id").eq("user_id", (profile as any).id).gte("completed_at", sinceISO),
          admin.from("daily_quiz_attempts").select("correct, total, pass").eq("user_id", (profile as any).id).eq("quiz_date", todayDate).maybeSingle(),
          admin.from("daily_checkins").select("streak_count").eq("user_id", (profile as any).id).eq("checkin_date", todayDate).maybeSingle(),
        ] as any);
        const lessonCount = (lessonsRes.data as any[])?.length ?? 0;
        const quizData = quizRes.data as any;
        const checkinData = checkinRes.data as any;
        const bodyLines = [
          `📚 完成 ${lessonCount} 個 lesson`,
          quizData ? `🧠 quiz：${quizData.correct}/${quizData.total} ${quizData.pass ? "✅" : "❌"}` : "🧠 quiz：今天還沒做",
          checkinData ? `🔥 連續簽到 ${checkinData.streak_count} 天` : "🔥 今天還沒簽到",
        ];
        if (lessonCount === 0 && !quizData && !checkinData) {
          bodyLines.push("", "今天還沒開始、去看一課吧 →");
        }
        await lineReply(replyToken, buildSimpleCard({
          emoji: "📊",
          title: "今日學習",
          accentColor: USER_ACCENT,
          body: bodyLines.join("\n"),
          buttons: [
            { label: "🛤️ 看完整足跡", uri: `${SITE_URL}/me/footprint`, primary: true },
            { label: "📚 繼續學", uri: `${SITE_URL}/chapters` },
          ],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.44. /weak — 列自己弱項章節（過去 30 天 quiz 平均 < 60）
      if (text === "/weak" || text === "弱項" || text === "我的弱項") {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();
        const { data: quizzes } = await admin
          .from("quiz_attempts")
          .select("chapter_id, score, total_questions, correct")
          .eq("user_id", (profile as any).id)
          .gte("attempted_at", since);
        const rows = (quizzes as any[]) ?? [];
        if (rows.length === 0) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🧠",
            title: "30 天內沒做過 quiz",
            accentColor: USER_ACCENT,
            body: "做一次 quiz 才看得出哪一章要補。",
            buttons: [{ label: "📚 看章節", uri: `${SITE_URL}/chapters`, primary: true }],
          }), token, QUICK_REPLY);
          continue;
        }
        const byChapter: Record<number, { sum: number; n: number }> = {};
        for (const r of rows) {
          if (!r.chapter_id) continue;
          const pct = r.total_questions > 0 ? (r.correct / r.total_questions) * 100 : 0;
          byChapter[r.chapter_id] ||= { sum: 0, n: 0 };
          byChapter[r.chapter_id].sum += pct;
          byChapter[r.chapter_id].n++;
        }
        const weak = Object.entries(byChapter)
          .map(([k, v]) => ({ chapter: Number(k), avg: v.sum / v.n, n: v.n }))
          .filter((x) => x.n >= 1 && x.avg < 60)
          .sort((a, b) => a.avg - b.avg)
          .slice(0, 5);
        if (weak.length === 0) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "💪",
            title: "沒弱項、繼續保持",
            accentColor: USER_ACCENT,
            body: "30 天 quiz 全部都過 60 分以上、做得很好！",
          }), token, QUICK_REPLY);
          continue;
        }
        const lines = weak.map((w, i) => `${i + 1}. Ch${String(w.chapter).padStart(2, "0")}：${w.avg.toFixed(0)} 分（${w.n} 次測驗）`);
        await lineReply(replyToken, buildSimpleCard({
          emoji: "⚠️",
          title: `弱項 Top ${weak.length}（< 60 分）`,
          accentColor: "#f59e0b",
          body: lines.join("\n"),
          buttons: [
            { label: `📚 複習 Ch${weak[0].chapter}`, uri: `${SITE_URL}/chapters/${weak[0].chapter}`, primary: true },
          ],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.45. /streak — 連續簽到 + 激勵
      if (text === "/streak" || text === "簽到" || text === "連續簽到") {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const { data: latest } = await admin
          .from("daily_checkins")
          .select("checkin_date, streak_count")
          .eq("user_id", (profile as any).id)
          .order("checkin_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        const latestRow = latest as any;
        const { data: longestRows } = await admin
          .from("daily_checkins")
          .select("streak_count")
          .eq("user_id", (profile as any).id)
          .order("streak_count", { ascending: false })
          .limit(1);
        const longest = (longestRows as any[])?.[0]?.streak_count ?? 0;
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
        let current = 0;
        let signedInToday = false;
        if (latestRow) {
          if (latestRow.checkin_date === today) {
            current = latestRow.streak_count ?? 0;
            signedInToday = true;
          } else if (latestRow.checkin_date === yesterday) {
            current = latestRow.streak_count ?? 0;
          }
        }
        const cheer = current >= 100 ? "🎖️ 百日修練、超神！" :
                      current >= 30 ? "🏆 一個月以上、強！" :
                      current >= 7  ? "🔥 一週連續、節奏抓住了" :
                      current >= 1  ? "💪 起步了、別斷" :
                                      "🌱 從今天開始連線";
        const bodyLines = [
          `🔥 目前連續：${current} 天`,
          `🏆 個人最長：${longest} 天`,
          "",
          cheer,
        ];
        if (!signedInToday) bodyLines.push("", "⏰ 今天還沒簽到、別讓連勝斷掉！");
        await lineReply(replyToken, buildSimpleCard({
          emoji: "🔥",
          title: "連續簽到",
          accentColor: signedInToday ? USER_ACCENT : "#f59e0b",
          body: bodyLines.join("\n"),
          buttons: [
            { label: signedInToday ? "🛤️ 看足跡" : "✅ 去簽到", uri: signedInToday ? `${SITE_URL}/me/footprint` : `${SITE_URL}/me`, primary: true },
          ],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.45z. /support 或 /admin — 強制轉真人客服、不被 AI 接管
      // 學員打「我想找真人」/「客服」/「admin」/「轉真人」都認、會建 ticket 通知 admin
      const supportMatch = text.match(/^\/(?:support|admin|找人|客服)(?:\s+(.+))?$/i)
        || (text.includes("找真人") || text.includes("找客服") || text === "轉真人" ? { 1: text } as any : null);
      if (supportMatch) {
        const issueText = (supportMatch[1] || "").toString().trim();
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id, username, display_name")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!issueText) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "💬",
            title: "想找真人 admin？",
            accentColor: "#f59e0b",
            body: "請描述你的問題、我會建 ticket 通知 admin。\n\n用法：\n/support 我的訂閱沒生效\n/客服 帳號被鎖住了\n\nadmin 24 小時內回覆、回覆會推到這個 LINE 對話。",
          }), token, QUICK_REPLY);
          continue;
        }
        const senderName = (profile as any)?.display_name || (profile as any)?.username || `LINE 學員${userId.slice(0, 6)}`;
        const { data: ticket } = await admin
          .from("tickets")
          .insert({
            user_id: (profile as any)?.id ?? null,
            subject: `🙋 LINE 求助：${issueText.slice(0, 40)}`,
            category: "support",
            priority: "high",
            status: "open",
            meta: { source: "user_line_bot_support_cmd", line_user_id: userId, sender_name: senderName },
          })
          .select("id")
          .single();
        if (ticket?.id) {
          await admin.from("ticket_messages").insert({
            ticket_id: ticket.id,
            author_type: "user",
            author_id: (profile as any)?.id ?? null,
            sender_type: "user",
            sender_id: (profile as any)?.id ?? null,
            body: issueText.slice(0, 4000),
            content: issueText.slice(0, 4000),
            is_staff: false,
            meta: { source: "line_user_bot_support_cmd", line_user_id: userId },
          });
        }
        const { notifyAdmin } = await import("@/lib/notify-admin");
        notifyAdmin({
          kind: "user_ticket",
          dedupeKey: `support:${ticket?.id ?? userId}:${Date.now()}`,
          text: `🆘 ${senderName} 主動求助：\n「${issueText.slice(0, 200)}」\n\n回覆：${SITE_URL}/${process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2"}/admin/crm${ticket?.id ? `/${ticket.id}` : ""}`,
        }).catch(() => {});
        await lineReply(replyToken, buildSimpleCard({
          emoji: "📩",
          title: "已通知 admin",
          accentColor: "#22c55e",
          body: `Ticket #${ticket?.id?.toString().slice(0, 8) ?? "-"} 已建立、admin 會在 24 小時內回覆。\n\n回覆會直接推到這個 LINE 對話、不用一直開網站。`,
          buttons: [{ label: "📝 我的 ticket", uri: `${SITE_URL}/me/support`, primary: true }],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.45a. /quote — 隨機抽一句 dev_quotes、清晨 / 通勤打開有感
      if (text === "/quote" || text === "語錄" || text === "金句") {
        const admin = createSupabaseAdmin();
        const { data: countRow } = await admin
          .from("dev_quotes")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);
        const total = (countRow as any)?.count ?? 0;
        if (total === 0) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "📜",
            title: "語錄庫還沒準備好",
            accentColor: USER_ACCENT,
            body: "請等語錄 seed 跑完。",
          }), token, QUICK_REPLY);
          continue;
        }
        const offset = Math.floor(Math.random() * total);
        const { data: q } = await admin
          .from("dev_quotes")
          .select("quote, author, translation_zh, category")
          .eq("is_active", true)
          .range(offset, offset)
          .single();
        const row = q as any;
        const lines: string[] = [];
        lines.push(row.quote);
        if (row.translation_zh && row.translation_zh !== row.quote) {
          lines.push("");
          lines.push(`📖 ${row.translation_zh}`);
        }
        lines.push("");
        lines.push(`— ${row.author ?? "Unknown"}`);
        await lineReply(replyToken, buildSimpleCard({
          emoji: "📜",
          title: "每日金句",
          accentColor: USER_ACCENT,
          body: lines.join("\n"),
          buttons: [{ label: "🎲 再抽一句", text: "/quote" }],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.45b. /recommend — 推下一課（弱項優先、其次接著進度往下）
      if (text === "/recommend" || text === "推薦" || text === "下一課") {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const uid = (profile as any).id;
        // 1. 找 30 天弱項（quiz < 60）
        const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
        const { data: weakQuizzes } = await admin
          .from("quiz_attempts")
          .select("chapter_id, correct, total_questions")
          .eq("user_id", uid)
          .gte("attempted_at", since30);
        const byCh: Record<number, { sum: number; n: number }> = {};
        for (const r of (weakQuizzes as any[]) ?? []) {
          if (!r.chapter_id || !r.total_questions) continue;
          const pct = (r.correct / r.total_questions) * 100;
          (byCh[r.chapter_id] ??= { sum: 0, n: 0 }).sum += pct;
          byCh[r.chapter_id].n += 1;
        }
        const weakChapters = Object.entries(byCh)
          .map(([id, v]) => ({ id: Number(id), avg: v.sum / v.n }))
          .filter((x) => x.avg < 60)
          .sort((a, b) => a.avg - b.avg);

        let pickReason = "";
        let pickChapter: any = null;
        let pickLesson: any = null;

        if (weakChapters.length > 0) {
          // 推弱章第一個 lesson
          const weakest = weakChapters[0];
          const { data: ch } = await admin.from("chapters").select("id, title").eq("id", weakest.id).maybeSingle();
          const { data: firstLesson } = await admin
            .from("lessons")
            .select("id, number, title, one_line_summary")
            .eq("chapter_id", weakest.id)
            .order("sort_order", { ascending: true })
            .limit(1)
            .maybeSingle();
          pickChapter = ch;
          pickLesson = firstLesson;
          pickReason = `📉 你 quiz 平均 ${weakest.avg.toFixed(0)} 分、這章最該補`;
        } else {
          // 沒弱項、找最後一課的下一課
          const { data: last } = await admin
            .from("lesson_progress")
            .select("lesson_id, chapter_id, completed_at, lessons(sort_order, chapter_id)")
            .eq("user_id", uid)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (last && (last as any).lessons) {
            const lastSort = (last as any).lessons.sort_order;
            const lastChId = (last as any).chapter_id;
            const { data: next } = await admin
              .from("lessons")
              .select("id, number, title, one_line_summary, chapter_id, chapters(title)")
              .eq("chapter_id", lastChId)
              .gt("sort_order", lastSort)
              .order("sort_order", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (next) {
              pickLesson = next;
              pickChapter = { id: (next as any).chapter_id, title: (next as any).chapters?.title };
              pickReason = "✅ 接著上次學到的、繼續往下";
            } else {
              // 同章學完、推下一章 first lesson
              const { data: nextCh } = await admin
                .from("chapters")
                .select("id, title")
                .gt("id", lastChId)
                .eq("status", "published")
                .order("id", { ascending: true })
                .limit(1)
                .maybeSingle();
              if (nextCh) {
                const { data: nextChFirst } = await admin
                  .from("lessons")
                  .select("id, number, title, one_line_summary")
                  .eq("chapter_id", (nextCh as any).id)
                  .order("sort_order", { ascending: true })
                  .limit(1)
                  .maybeSingle();
                pickChapter = nextCh;
                pickLesson = nextChFirst;
                pickReason = "🎉 上一章學完了、進新章吧";
              }
            }
          }
        }

        if (!pickLesson) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🎯",
            title: "找不到推薦",
            accentColor: USER_ACCENT,
            body: "做一次 quiz 或學一課我就能推。",
            buttons: [{ label: "📚 章節地圖", uri: `${SITE_URL}/chapters`, primary: true }],
          }), token, QUICK_REPLY);
          continue;
        }

        const lessonNum = (pickLesson as any).number || (pickLesson as any).id;
        const lessonTitle = (pickLesson as any).title;
        const summary = (pickLesson as any).one_line_summary || "";
        const chTitle = (pickChapter as any)?.title || "";
        const chId = (pickChapter as any)?.id;
        await lineReply(replyToken, buildSimpleCard({
          emoji: "🎯",
          title: `推薦：${lessonNum}`,
          accentColor: USER_ACCENT,
          body: `${pickReason}\n\n📖 ${lessonTitle}${chTitle ? `（Ch${chId} ${chTitle}）` : ""}${summary ? `\n\n${summary}` : ""}`,
          buttons: [
            { label: "▶ 去學這課", uri: `${SITE_URL}/chapters/${chId}#lesson-${(pickLesson as any).id}`, primary: true },
            { label: "🎲 換一個", text: "/recommend" },
          ],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.45c. /goal — 設每日目標 / 看達成度
      const goalSetMatch = text.match(/^\/goal\s+(\d+)$/i);
      if (text === "/goal" || text === "目標" || goalSetMatch) {
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        const uid = (profile as any).id;
        const today = new Date().toISOString().slice(0, 10);

        if (goalSetMatch) {
          const target = Math.min(20, Math.max(1, Number(goalSetMatch[1])));
          await admin
            .from("user_daily_goals")
            .upsert({ user_id: uid, goal_date: today, target_lessons: target }, { onConflict: "user_id,goal_date" });
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🎯",
            title: "目標設好了",
            accentColor: USER_ACCENT,
            body: `今天目標：完成 ${target} 個 lesson\n\n加油、晚上來查 /goal 看達成。`,
            buttons: [{ label: "📚 開始學", uri: `${SITE_URL}/chapters`, primary: true }],
          }), token, QUICK_REPLY);
          continue;
        }

        // 查目標 + 進度
        const { data: goal } = await admin
          .from("user_daily_goals")
          .select("target_lessons")
          .eq("user_id", uid)
          .eq("goal_date", today)
          .maybeSingle();
        const target = (goal as any)?.target_lessons ?? 0;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: done } = await admin
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", uid)
          .gte("completed_at", startOfDay.toISOString());
        const doneCount = (done as any[])?.length ?? 0;

        if (target === 0) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🎯",
            title: "今天還沒設目標",
            accentColor: USER_ACCENT,
            body: "傳「/goal N」設今日目標（N 個 lesson）\n\n例：/goal 3 = 今天完成 3 課",
          }), token, QUICK_REPLY);
          continue;
        }

        const pct = Math.min(100, Math.round((doneCount / target) * 100));
        const filled = Math.round(pct / 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        const remark = pct >= 100 ? "🏆 達標、棒！" :
                       pct >= 70 ? "🔥 快達標、再衝一下" :
                       pct >= 30 ? "💪 進度過半要加油" :
                                   "🌱 才開始、慢慢來";
        await lineReply(replyToken, buildSimpleCard({
          emoji: "🎯",
          title: "今日目標",
          accentColor: pct >= 100 ? "#22c55e" : USER_ACCENT,
          body: `${bar} ${pct}%\n${doneCount} / ${target} lesson\n\n${remark}`,
          buttons: [{ label: "📚 繼續學", uri: `${SITE_URL}/chapters`, primary: true }],
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.46. /lesson <關鍵字> — 找特定 lesson 直連網站
      const lessonMatch = text.match(/^\/lesson\s+(.+)/i) || text.match(/^找課\s+(.+)/);
      if (lessonMatch) {
        const keyword = lessonMatch[1].trim();
        if (keyword.length < 2) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🔎",
            title: "請給關鍵字",
            accentColor: USER_ACCENT,
            body: "用法：/lesson React\n或：/lesson 變數",
          }), token, QUICK_REPLY);
          continue;
        }
        const admin = createSupabaseAdmin();
        const kwSafe = keyword.replace(/[%_\\]/g, "\\$&");
        const { data: lessons } = await admin
          .from("lessons")
          .select("id, chapter_id, number, title, one_line_summary")
          .or(`title.ilike.%${kwSafe}%,one_line_summary.ilike.%${kwSafe}%`)
          .limit(8);
        const rows = (lessons as any[]) ?? [];
        if (rows.length === 0) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🔎",
            title: `找不到「${keyword}」`,
            accentColor: USER_ACCENT,
            body: "換個關鍵字試試、或到網站章節地圖瀏覽。",
            buttons: [{ label: "📚 章節地圖", uri: `${SITE_URL}/chapters`, primary: true }],
          }), token, QUICK_REPLY);
          continue;
        }
        const lines = rows.slice(0, 5).map((l: any) =>
          `${l.number} ${l.title}\n  → ${SITE_URL}/chapters/${l.chapter_id}#lesson-${l.id}`
        );
        await lineReply(replyToken, buildSimpleCard({
          emoji: "🔎",
          title: `「${keyword}」找到 ${rows.length} 個`,
          accentColor: USER_ACCENT,
          body: lines.join("\n\n").slice(0, 1900),
          buttons: rows.length > 0 ? [
            { label: `📖 看 ${rows[0].title.slice(0, 18)}`, uri: `${SITE_URL}/chapters/${rows[0].chapter_id}#lesson-${rows[0].id}`, primary: true },
          ] : undefined,
        }), token, QUICK_REPLY);
        continue;
      }

      // 3.47. /explain <概念> — AI 一句話解釋
      const explainMatch = text.match(/^\/explain\s+(.+)/i) || text.match(/^解釋\s+(.+)/);
      if (explainMatch) {
        const concept = explainMatch[1].trim();
        if (concept.length < 2) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "💡",
            title: "請給概念",
            accentColor: USER_ACCENT,
            body: "用法：/explain 變數\n或：/explain React Hook",
          }), token, QUICK_REPLY);
          continue;
        }
        const admin = createSupabaseAdmin();
        const { data: profile } = await admin
          .from("profiles")
          .select("id, display_name, username, role, xp, level")
          .eq("line_user_id", userId)
          .maybeSingle();
        if (!profile) {
          await lineReply(replyToken, cardUnbound(userId), token, QUICK_REPLY);
          continue;
        }
        // 包成 explain prompt 給 askUserAI
        const explainPrompt = `用「國中生能懂」的方式、3 行內白話解釋「${concept}」是什麼。先給最簡單的類比、再給技術定義。不要超過 100 字。`;
        const aiResult = await askUserAI(explainPrompt, profile as any, userId);
        if (!aiResult) {
          await lineReply(replyToken, buildSimpleCard({
            emoji: "🤖",
            title: "AI 暫時無法回覆",
            accentColor: "#ef4444",
            body: "可能 quota 用完或網路問題、過會兒再試。",
          }), token, QUICK_REPLY);
          continue;
        }
        await lineReply(replyToken, buildSimpleCard({
          emoji: "💡",
          title: `白話解釋：${concept}`,
          accentColor: USER_ACCENT,
          body: aiResult.reply.slice(0, 1900),
          buttons: [
            { label: `🔎 找相關 lesson`, postback: `action=find_lesson&keyword=${encodeURIComponent(concept).slice(0, 100)}`, primary: true },
          ],
        }), token, aiResult.assistantMsgId ? buildNoteQuickReply(aiResult.assistantMsgId) : QUICK_REPLY);
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
          // 動態 Quick Reply：有 assistantMsgId 用「📝 存筆記」按鈕、否則退回預設
          const qr = aiResult.assistantMsgId ? buildNoteQuickReply(aiResult.assistantMsgId) : QUICK_REPLY;
          await lineReply(replyToken, msgs, token, qr);
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
