import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { getAdminLineUser, type AdminLineUser } from "@/lib/admin-line-users";
import { runBotCommand, isCommand } from "@/lib/line-bot-commands";
import { buildAiReplyCard, buildQuickReply, COMMON_QR, type FlexMessage, type LineTextMessage } from "@/lib/line-flex";
import { runPostback } from "@/lib/line-postback";
import { getLiveSnapshot } from "@/lib/site-status-snapshot";
import { askAIWithTools } from "@/lib/line-ai-tools";
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

const ENDPOINT = "https://api.line.me/v2/bot";

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

    await fetch(`${ENDPOINT}/message/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages: [msg] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[line-webhook] reply failed:", (e as any)?.message);
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

  const hist = getHistory(adminUser.id);
  hist.push({ role: "user", content: message });
  if (hist.length > 20) hist.splice(0, hist.length - 20);

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

  try {
    const reply = await askAIWithTools({
      apiKey,
      model: model.model_name,
      systemPrompt,
      history: hist,
      user: adminUser,
    });
    hist.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) {
    await logLineError("askAIWithTools_failed", e?.message ?? "unknown", { adminUserId: adminUser.id, model: model.model_name });
    return `❌ AI 呼叫失敗 (${model.model_name})：${e?.message ?? "未知錯誤"}\n(已寫 error_logs、可到 /admin/errors 看 stack)`;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_LINE_CHANNEL_SECRET;
  const token = process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!secret || !token) return NextResponse.json({ ok: false, error: "no_env" });

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-line-signature"), secret)) {
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
        const isAdmin = getAdminLineUser(userId);
        const msg = isAdmin
          ? `🏝️ AI 島 admin bot 已啟動！\n\n你的 userId：\n${userId}\n\n把這個貼進 Zeabur 環境變數 ADMIN_LINE_USER_ID（或 ADMIN_LINE_USERS JSON）、之後就會收到通知、也能直接跟我聊。`
          : `🏝️ 歡迎加入 AI 島！\n\n要綁定帳號讓我推學習通知給你：\n1. 到 ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw"}/settings 拿 6 位綁定 code\n2. 傳給我「/bind 123456」\n\n綁定後完課 / 升等 / 論壇回覆 / 解鎖成就都會推到你的 LINE。`;
        await lineReply(replyToken, msg, token);
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
            await lineReply(
              replyToken,
              `✅ 綁定成功！\n\n之後你的學習動態會通知你：\n• 完成 lesson\n• 升等\n• 解鎖成就\n• 論壇被回覆\n\n要關通知到「設定 → LINE 通知」改、或傳「/unbind」解除。`,
              token,
            );
          } else {
            const reasonMap: Record<string, string> = {
              invalid_format: "code 格式不對、應該是 6 位數字",
              code_not_found: "code 找不到、可能輸入錯或過期",
              code_expired: "code 過期了、請到網站重拿（5 分鐘有效）",
              line_already_bound_to_another: "這個 LINE 已綁過別的帳號、先到網站解除原綁定",
            };
            await lineReply(
              replyToken,
              `❌ 綁定失敗：${reasonMap[result.reason ?? ""] ?? result.reason}\n\n到 ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw"}/settings 重拿 code。`,
              token,
            );
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
          await lineReply(replyToken, "✅ 已解除綁定、不再推通知給你。要重綁、到網站設定再拿 code。", token);
          continue;
        }

        // 不是綁定指令、提示綁定流程
        await lineReply(
          replyToken,
          `🤖 嗨～還沒綁定帳號\n\n要綁定請：\n1. 到 ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw"}/settings 拿 6 位 code\n2. 在這裡傳「/bind 123456」\n\n你的 LINE userId: ${userId}`,
          token,
        );
        continue;
      }

      if (text === "/clear" || text === "清空" || text === "重來") {
        historyByUser.set(userId, []);
        await lineReply(replyToken, `✨ ${adminUser.name} 的對話歷史已清空`, token);
        continue;
      }

      // /whoami — debug 用、admin 看自己 userId + 角色
      if (text === "/whoami" || text === "我是誰" || text === "whoami") {
        await lineReply(
          replyToken,
          `🆔 你的 LINE userId：\n${userId}\n\n✅ 已驗證為 admin：\n• 名稱: ${adminUser.name}\n• 角色: ${adminUser.role}\n\nuserId 跟 env ADMIN_LINE_USER_ID 一致才會走 admin 流程、不一致會被當訪客。`,
          token,
        );
        continue;
      }

      if (isCommand(text)) {
        const reply = await runBotCommand(text, adminUser);
        await lineReply(replyToken, reply.flex ?? reply.text, token);
        continue;
      }

      const answer = await askAI(text, adminUser);
      const aiCard = buildAiReplyCard({ text: answer, userName: adminUser.name });
      await lineReply(replyToken, aiCard, token);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook" });
}
