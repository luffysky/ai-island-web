import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { getAdminLineUser, type AdminLineUser } from "@/lib/admin-line-users";
import { runBotCommand, isCommand } from "@/lib/line-bot-commands";
import { buildAiReplyCard, buildAIErrorCard, buildSimpleCard, buildQuickReply, COMMON_QR, type FlexMessage, type LineTextMessage } from "@/lib/line-flex";
import { runPostback } from "@/lib/line-postback";
import { getLiveSnapshot } from "@/lib/site-status-snapshot";
import { askAIWithTools } from "@/lib/line-ai-tools";
import {
  getOrCreateAdminConversation,
  loadAdminHistory,
  saveAdminTurn,
  clearAdminConversation,
} from "@/lib/bot-admin-conversation";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { checkOwner, OWNER_NAME_TW } from "@/lib/is-owner";

async function logLineError(code: string, message: string, extra: any = {}) {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("error_logs").insert({
      source: "line-webhook",
      level: "error",
      message: `[${code}] ${message}`,
      extra,
    });
  } catch {}
  console.warn(`[line-webhook] ${code}:`, message, extra);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// LINE bot tool use 偶爾跑 15-25 秒、預設 10s 會被 kill → 拉到 60s
export const maxDuration = 60;

const ENDPOINT = "https://api.line.me/v2/bot";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2";
const ADMIN_ACCENT = "#bd93f9";  // admin LINE 紫色（區別 user 紫 #a78bfa）
const SUCCESS_ACCENT = "#50fa7b";
const WARN_ACCENT = "#ffb86c";
const INFO_ACCENT = "#8be9fd";

// 統一 admin LINE 卡片風格
function adminFollowCard(userId: string, isAdmin: boolean): FlexMessage {
  if (isAdmin) {
    return buildSimpleCard({
      emoji: "🏝️",
      title: "AI 島 admin bot 已啟動",
      accentColor: ADMIN_ACCENT,
      body: "把你的 userId 貼進 Zeabur env ADMIN_LINE_USER_ID（或 ADMIN_LINE_USERS JSON）、之後就會收到通知 + 可直接跟我聊。",
      meta: [{ label: "🆔 userId", value: userId.slice(0, 12) + "..." }],
      buttons: [
        { label: "後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin`, primary: true },
        { label: "看 env 設定", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/system` },
      ],
    });
  }
  return buildSimpleCard({
    emoji: "🏝️",
    title: "歡迎加入 AI 島",
    accentColor: ADMIN_ACCENT,
    body: "綁定帳號讓我推學習通知給你。",
    meta: [
      { label: "Step 1", value: "去網站「設定」拿 6 位 code" },
      { label: "Step 2", value: "傳「/bind 123456」" },
    ],
    buttons: [
      { label: "拿綁定 code", uri: `${SITE_URL}/settings`, primary: true },
      { label: "看章節", uri: `${SITE_URL}/chapters` },
    ],
  });
}

function adminBindResultCard(ok: boolean, reason?: string): FlexMessage {
  if (ok) {
    return buildSimpleCard({
      emoji: "✅",
      title: "綁定成功",
      accentColor: SUCCESS_ACCENT,
      body: "之後完課 / 升等 / 解鎖成就 / 論壇被回覆都會推到你 LINE。",
      meta: [
        { label: "🔕 關通知", value: "傳「/unbind」" },
        { label: "⚙️ 細部設定", value: "去網站「設定」" },
      ],
      buttons: [
        { label: "去學習", uri: `${SITE_URL}/chapters`, primary: true },
        { label: "設定", uri: `${SITE_URL}/settings` },
      ],
    });
  }
  return buildSimpleCard({
    emoji: "❌",
    title: "綁定失敗",
    accentColor: "#ff5555",
    body: reason ?? "未知錯誤",
    buttons: [{ label: "重拿 code", uri: `${SITE_URL}/settings`, primary: true }],
  });
}

function adminUnbindCard(): FlexMessage {
  return buildSimpleCard({
    emoji: "🔕",
    title: "已解除綁定",
    accentColor: "#6272a4",
    body: "之後不再推通知。要重綁去網站重拿 code。",
    buttons: [{ label: "重綁", uri: `${SITE_URL}/settings`, primary: true }],
  });
}

function adminUnboundHintCard(userId: string): FlexMessage {
  return buildSimpleCard({
    emoji: "🤖",
    title: "嗨～還沒綁定",
    accentColor: ADMIN_ACCENT,
    body: "綁定後完課 / 升等 / 論壇被回覆會推給你。",
    meta: [
      { label: "1️⃣", value: "去網站「設定」拿 6 位 code" },
      { label: "2️⃣", value: "傳「/bind 123456」" },
      { label: "🆔", value: userId.slice(0, 12) + "..." },
    ],
    buttons: [
      { label: "去拿 code", uri: `${SITE_URL}/settings`, primary: true },
      { label: "登入", uri: `${SITE_URL}/login` },
    ],
  });
}

function adminClearCard(name: string): FlexMessage {
  return buildSimpleCard({
    emoji: "✨",
    title: "對話歷史已清空",
    accentColor: INFO_ACCENT,
    body: `${name} 的對話 context 已重置、下一句重新開始。`,
  });
}

function adminWhoamiCard(userId: string, adminUser: { name: string; role: string }): FlexMessage {
  return buildSimpleCard({
    emoji: "🆔",
    title: "已驗證為 admin",
    accentColor: SUCCESS_ACCENT,
    body: "你的 LINE userId 跟 env ADMIN_LINE_USER_ID 一致、走 admin 流程。",
    meta: [
      { label: "名稱", value: adminUser.name },
      { label: "角色", value: adminUser.role },
      { label: "LINE userId", value: userId.slice(0, 16) + "..." },
    ],
    buttons: [
      { label: "後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin`, primary: true },
      { label: "錯誤監控", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/errors` },
    ],
  });
}

type Msg = { role: "user" | "assistant"; content: string };
const historyByUser = new Map<string, Msg[]>();
function getHistory(uid: string): Msg[] {
  if (!historyByUser.has(uid)) historyByUser.set(uid, []);
  return historyByUser.get(uid)!;
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function lineReply(replyToken: string, payload: string | FlexMessage | LineTextMessage, token: string) {
  try {
    let msg: any;
    if (typeof payload === "string") {
      msg = { type: "text", text: payload.slice(0, 4900) };
    } else {
      msg = { ...payload };
    }
    // 補預設 Quick Reply（如果還沒設）
    if (!msg.quickReply) msg.quickReply = buildQuickReply(COMMON_QR);

    const res = await fetch(`${ENDPOINT}/message/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages: [msg] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await logLineError("reply_api_failed", `LINE reply API ${res.status}: ${body.slice(0, 200)}`, {
        status: res.status,
        body: body.slice(0, 500),
        replyToken_prefix: replyToken.slice(0, 12) + "...",
        hint: res.status === 400 && body.includes("Invalid reply token") ? "reply token 過期 / 已用過、訊息處理太慢、看 maxDuration 是否夠" : "看 body",
      });
    }
  } catch (e) {
    await logLineError("reply_fetch_failed", (e as any)?.message ?? "unknown", {
      error: String(e).slice(0, 300),
    });
  }
}

async function askAI(message: string, adminUser: AdminLineUser): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data: models, error: modelsErr } = await admin.from("ai_models").select("*").eq("is_active", true).limit(20);
  if (modelsErr) {
    await logLineError("ai_models_query_failed", modelsErr.message, { adminUserId: adminUser.id });
    return `❌ AI 模型表查詢失敗：${modelsErr.message}\n(已寫入 error_logs、林董到 /admin/errors 查)`;
  }
  if (!models || models.length === 0) {
    return "❌ AI 模型未設定 — 到後台「AI 模型管理」啟用 1 個 model。";
  }
  // 看後台 AI 用途設定 (新功能) — 找 line_admin 對應 model
  const usage = await pickModelForUsage("line_admin", models as any[]);
  const model = usage ?? (models as any[])?.find((m) => m.provider === "anthropic") ?? (models as any[])?.[0];

  const { data: sysKey, error: keyErr } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (keyErr) {
    await logLineError("ai_keys_query_failed", keyErr.message, { adminUserId: adminUser.id, provider: model.provider });
    return `❌ AI key 表查詢失敗：${keyErr.message}`;
  }
  if (!sysKey) return `❌ 沒設定 ${model.provider} 的 API key — 到後台「AI 模型管理」加`;
  if (!(sysKey as any).enabled) return `❌ ${model.provider} API key 已停用 — 到後台「AI 模型管理」啟用`;

  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); }
  catch (e: any) {
    await logLineError("ai_key_decrypt_failed", e?.message ?? "decrypt failed", { provider: model.provider });
    return `❌ AI key 解密失敗 (AI_KEY_SECRET 環境變數可能不對)`;
  }

  // 對話歷史走 DB persistent（找不到林董 profile → 退回 in-memory）
  const convId = await getOrCreateAdminConversation({
    channel: "line_admin",
    channelUserId: adminUser.id,
  });
  const dbHist = convId ? await loadAdminHistory(convId, 20) : getHistory(adminUser.id);
  const hist: Array<{ role: "user" | "assistant"; content: string }> = [
    ...dbHist,
    { role: "user", content: message },
  ];
  // in-memory fallback：DB 沒接到時仍要寫進 map、不然下次 reload 也空
  if (!convId) {
    const mem = getHistory(adminUser.id);
    mem.push({ role: "user", content: message });
    if (mem.length > 20) mem.splice(0, mem.length - 20);
  }

  // 30 秒快取的站台即時狀態（規模 / 健康 / 商務 / 現在誰在用 / 訪客足跡 / 最新 audit / error）
  const snapshot = await getLiveSnapshot().catch(() => "");

  // 從 LINE userId + role 多 signal 判斷是不是林董
  const ownerCheck = checkOwner({
    lineUserId: adminUser.id,
    lineRole: adminUser.role,
    username: adminUser.name,
  });
  const callerName = ownerCheck.isOwner ? OWNER_NAME_TW : adminUser.name;

  const systemPrompt = `你是 AI 島的管理員 AI 助理。
目前對話者：${callerName}（${adminUser.role}${ownerCheck.isOwner ? "、👑 平台 Owner、本站最高權限" : ""}）。

【你的模型身份】
- 你目前運行在 ${model.provider} 的 ${model.model_name}
- 被問「你是誰 / 哪個 model / 哪版」時、就照這個答、不要猜、不要說自己是 Claude Sonnet 3.5 之類沒設定的版本

【最重要的規則 — 一定要回】
無論收到什麼訊息、永遠用文字回答、不可以沉默。
- 閒聊 / 問候 / 玩笑 / 哲學問題 / 「你相信光嗎」這類 → 用對話能力直接答、不要呼叫 tool、不要拒絕
- 看不懂的訊息 → 問他「你想了解什麼？」、不要當作沒看到

要點：
- 用繁中、語氣自然、像信任的同事在聊
- ${ownerCheck.isOwner ? `你正在跟「林董 (Luffy 林、本平台 Owner)」對話、稱呼「林董」、是他的事業助手、幫忙決策 / 看報表 / 整理思緒 / 也可以閒聊、不要端官話` : "你是後台助理、協助處理日常運維"}
- 主動意識：他在 LINE 問問題、可能在外面忙、給簡潔可執行的答覆

【tool 只用於這 5 種「明確要查資料」的情境】
- 報表 / 統計 / KPI / 用戶活躍 / 流失 / 訂單金額 / 錯誤趨勢 → run_command
- 問特定使用者 → get_user_detail
- 問特定錯誤 → get_recent_errors / get_error_detail
- 問特定訂單 → get_order_detail
- 問週月成長報告 → get_period_report

【絕對「不要」用 tool】
- 閒聊：「你好」「累不累」「你相信光嗎」「想吃什麼」「你覺得 X」→ 直接聊
- 答案已在下面「即時狀態快照」內 → 直接用快照講、不必呼叫 tool
- 抽象 / 思考性問題 → 用你自己的判斷答

【回答風格】
- 直接、像同事、講人話別講官話
- 拿到 tool 結果後整理重點、不要原樣貼一坨數字

────────── 即時狀態 ──────────
${snapshot}
──────────────────────────────`;

  // 兩條路：claude → 走 tool use（自動查 KPI/users/errors）、其他 → 純對話（便宜、不打 tool）
  // 林董：「預設用 gpt 就好、用到 tool 再自己跳轉到 claude、不然帳單你幫我繳？」
  // → usage_models 設 gpt-4o-mini 時走 callAI 純聊；要 tool 才把 line_admin usage 改成 claude。
  const useToolUse = model.provider === "anthropic" && /claude/i.test(model.model_name);

  try {
    let reply: string;
    if (useToolUse) {
      reply = await askAIWithTools({
        apiKey,
        model: model.model_name,
        systemPrompt,
        history: hist,
        user: adminUser,
      });
    } else {
      // OpenAI / Gemini / Groq：走通用 callAI、純對話、沒 admin tools
      const { callAI } = await import("@/lib/ai-providers");
      const r = await callAI({
        provider: model.provider,
        model: model.model_name,
        apiKey,
        messages: [
          { role: "system", content: systemPrompt },
          ...hist.map((h) => ({ role: h.role, content: h.content })),
        ],
        temperature: 0.7,
        maxTokens: 800,
      });
      reply = r.text || "（AI 沒回應、再問一次試試）";
    }
    if (convId) {
      await saveAdminTurn(convId, message, reply, `${model.provider}/${model.model_name}`).catch((e) => {
        console.warn("[line-webhook] saveAdminTurn failed:", (e as any)?.message);
      });
    } else {
      const mem = getHistory(adminUser.id);
      mem.push({ role: "assistant", content: reply });
      if (mem.length > 20) mem.splice(0, mem.length - 20);
    }
    return reply;
  } catch (e: any) {
    await logLineError("askAI_failed", e?.message ?? "unknown", { adminUserId: adminUser.id, provider: model.provider, model: model.model_name, useToolUse });
    return `❌ AI 呼叫失敗 (${model.model_name})：${e?.message ?? "未知錯誤"}\n(已寫 error_logs、可到 /admin/errors 看 stack)`;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_LINE_CHANNEL_SECRET;
  const token = process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!secret || !token) {
    console.warn("[line-webhook:admin] no_env");
    return NextResponse.json({ ok: false, error: "no_env" });
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("x-line-signature");
  const sigOk = verifySignature(raw, sigHeader, secret);
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  console.log(`[line-webhook:admin] sig_received=${sigHeader?.slice(0,12)}... expected=${expected.slice(0,12)}... ok=${sigOk} body_len=${raw.length}`);

  if (!sigOk) {
    await logLineError("invalid_signature", "簽章驗證失敗 — ADMIN_LINE_CHANNEL_SECRET 跟 LINE 算的對不上", {
      received_sig_prefix: sigHeader?.slice(0, 16) ?? null,
      expected_sig_prefix: expected.slice(0, 16),
      body_len: raw.length,
      secret_length: secret.length,
      hint: "去 LINE Developer Console → admin channel → Basic settings → Channel secret、整段複製對 Zeabur env、一字不差",
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const events: any[] = body.events ?? [];

  for (const ev of events) {
    const replyToken = ev.replyToken;
    const userId = ev.source?.userId as string | undefined;

    if (ev.type === "follow") {
      if (replyToken && userId) {
        const isAdmin = !!getAdminLineUser(userId);
        await lineReply(replyToken, adminFollowCard(userId, isAdmin), token);
      }
      continue;
    }

    // PostBack（卡片按鈕 / Rich Menu）
    if (ev.type === "postback") {
      if (!replyToken || !userId) continue;
      const adminUser = getAdminLineUser(userId);
      if (!adminUser) {
        await lineReply(replyToken, "🤖 非授權 admin、忽略 postback", token);
        continue;
      }
      const reply = await runPostback(ev.postback?.data ?? "", adminUser);
      await lineReply(replyToken, reply.flex ?? reply.text, token);
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text") {
      const text = String(ev.message.text ?? "").trim();
      if (!replyToken || !userId) continue;

      const adminUser = getAdminLineUser(userId);
      if (!adminUser) {
        // 非 admin user — 檢查是否是綁定 code
        const bindMatch = text.match(/^\/?bind\s+(\d{6})$/i);
        if (bindMatch) {
          const { consumeBindCode } = await import("@/lib/notify-user-line");
          const result = await consumeBindCode(bindMatch[1], userId);
          if (result.ok) {
            await lineReply(replyToken, adminBindResultCard(true), token);
          } else {
            const reasonMap: Record<string, string> = {
              invalid_format: "code 格式不對、應該是 6 位數字",
              code_not_found: "code 找不到、可能輸入錯或過期",
              code_expired: "code 過期了、請到網站重拿（5 分鐘有效）",
              line_already_bound_to_another: "這個 LINE 已綁過別的帳號、先到網站解除原綁定",
            };
            await lineReply(replyToken, adminBindResultCard(false, reasonMap[result.reason ?? ""] ?? result.reason), token);
          }
          continue;
        }

        // 檢查是否是 /unbind
        if (text === "/unbind" || text === "解除") {
          const supabase = createSupabaseAdmin();
          await supabase
            .from("profiles")
            .update({
              line_user_id: null,
              line_bound_at: null,
              line_notify_enabled: false,
            })
            .eq("line_user_id", userId);
          await lineReply(replyToken, adminUnbindCard(), token);
          continue;
        }

        // 不是綁定指令、提示綁定流程
        await lineReply(replyToken, adminUnboundHintCard(userId), token);
        continue;
      }

      if (text === "/clear" || text === "清空" || text === "重來") {
        const convId = await getOrCreateAdminConversation({
          channel: "line_admin",
          channelUserId: adminUser.id,
        });
        if (convId) {
          await clearAdminConversation(convId).catch(() => {});
        }
        historyByUser.set(userId, []);  // in-memory fallback 也清
        await lineReply(replyToken, adminClearCard(adminUser.name), token);
        continue;
      }

      // /whoami — debug 用、admin 看自己 userId + 角色
      if (text === "/whoami" || text === "我是誰" || text === "whoami") {
        await lineReply(replyToken, adminWhoamiCard(userId, adminUser), token);
        continue;
      }

      if (isCommand(text)) {
        const reply = await runBotCommand(text, adminUser);
        await lineReply(replyToken, reply.flex ?? reply.text, token);
        continue;
      }

      const answer = await askAI(text, adminUser);
      // AI 失敗的回覆都用 "❌ " 開頭、不要 dump 給林董看醜 JSON、改成友善錯誤卡 + 修復按鈕
      if (answer.startsWith("❌ ")) {
        const errMsg = answer.slice(2).trim();
        const isAuthErr = /401|invalid x-api-key|key 失效|key.*disabled|key 已停用|沒設定.*key/i.test(errMsg);
        const isModelErr = /模型.*不存在|model.*not.*found|沒設定|未設定/i.test(errMsg);
        const isDecryptErr = /解密失敗|AI_KEY_SECRET/i.test(errMsg);
        const fixUrl = isAuthErr || isModelErr || isDecryptErr
          ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}/${process.env.NEXT_PUBLIC_ADMIN_SLUG ?? "console-x7k2"}/admin/ai-models`
          : undefined;
        const hint = isAuthErr ? "去後台貼新 API key（Anthropic Console 重發一支）"
          : isModelErr ? "去後台 AI 模型管理啟用 / 換 model"
          : isDecryptErr ? "Zeabur env AI_KEY_SECRET 跟當時加密的不一樣、用同一把"
          : /限流|429/i.test(errMsg) ? "等 1 分鐘再問、或升 API tier"
          : /超時|太慢|timeout/i.test(errMsg) ? "再傳一次（可能網路抖動）"
          : "看 /admin/errors 抓 stack trace";
        await lineReply(replyToken, buildAIErrorCard({
          message: errMsg,
          hint,
          fixUrl,
          fixLabel: fixUrl ? "去後台修" : undefined,
          userName: adminUser.name,
        }), token);
      } else {
        const aiCard = buildAiReplyCard({ text: answer, userName: adminUser.name });
        await lineReply(replyToken, aiCard, token);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook" });
}
