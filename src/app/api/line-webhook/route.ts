import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "https://api.line.me/v2/bot";

/**
 * LINE Messaging API webhook
 *
 * 行為：
 *  - follow（加 bot 為好友）：回 welcome + 「你的 userId 是 XXX、貼進 ADMIN_LINE_USER_ID env」
 *  - message：
 *    - 來自 admin（userId === ADMIN_LINE_USER_ID）→ 呼叫 AI 回答（用 system key）
 *    - 其他人 → 回「這是 admin 通知 bot、無法閒聊」+ 該人 userId（debug 用）
 *
 * 林董設好 env：
 *   ADMIN_LINE_CHANNEL_TOKEN=xxx     # LINE Developers Console → Messaging API → Channel access token (long-lived)
 *   ADMIN_LINE_CHANNEL_SECRET=xxx    # Basic settings → Channel secret
 *   ADMIN_LINE_USER_ID=Uxxxx         # 第一次加 bot 為好友後、webhook 會回覆你看
 *
 * 然後在 LINE Developers Console 把 webhook URL 設成：
 *   https://你的網站/api/line-webhook
 *   並開啟「Use webhook」
 */

const CHAT_HISTORY_KEY = "line-admin-chat";
type Msg = { role: "user" | "assistant"; content: string };
let history: Msg[] = []; // in-memory、單實例、保留 10 輪

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function lineReply(replyToken: string, text: string, token: string) {
  try {
    await fetch(`${ENDPOINT}/message/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[line-webhook] reply failed:", (e as any)?.message);
  }
}

async function askAI(message: string): Promise<string> {
  const admin = createSupabaseAdmin();
  // 拿一個 active model（優先 anthropic）
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true).limit(20);
  const model = (models as any[])?.find((m) => m.provider === "anthropic") ?? (models as any[])?.[0];
  if (!model) return "❌ AI 模型未設定";
  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return "❌ AI key 未設定";
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); }
  catch { return "❌ AI key 解密失敗"; }

  // 加進 history
  history.push({ role: "user", content: message });
  if (history.length > 20) history = history.slice(-20);

  try {
    const resp = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: "你是 AI 島的管理員助理、跟 luffy 林董對話。簡潔回答、用繁中。" },
        ...history.map((h) => ({ role: h.role, content: h.content })),
      ],
      temperature: 0.7,
      maxTokens: 800,
    });
    history.push({ role: "assistant", content: resp.text });
    return resp.text;
  } catch (e: any) {
    return `❌ AI 呼叫失敗：${e?.message ?? "未知錯誤"}`;
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

  const adminUserId = process.env.ADMIN_LINE_USER_ID;
  const events: any[] = body.events ?? [];

  for (const ev of events) {
    const replyToken = ev.replyToken;
    const userId = ev.source?.userId as string | undefined;

    if (ev.type === "follow") {
      if (replyToken && userId) {
        await lineReply(
          replyToken,
          `🏝️ AI 島 admin bot 已啟動！\n\n` +
          `你的 userId：\n${userId}\n\n` +
          `把這個貼進 Zeabur 環境變數 ADMIN_LINE_USER_ID、之後就會收到通知、也能直接跟我聊。`,
          token,
        );
      }
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text") {
      const text = String(ev.message.text ?? "").trim();
      if (!replyToken) continue;

      if (!adminUserId) {
        await lineReply(replyToken, `⚠️ ADMIN_LINE_USER_ID 還沒設、你的 userId：\n${userId}`, token);
        continue;
      }
      if (userId !== adminUserId) {
        await lineReply(replyToken, `🤖 這是 admin 專用 bot、無法閒聊。\n你的 userId: ${userId}`, token);
        continue;
      }
      // admin user → 呼 AI
      if (text === "/clear" || text === "清空" || text === "重來") {
        history = [];
        await lineReply(replyToken, "✨ 對話歷史已清空", token);
        continue;
      }
      const answer = await askAI(text);
      await lineReply(replyToken, answer, token);
    }
  }

  return NextResponse.json({ ok: true });
}

// LINE 可能送 verify GET 請求
export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook" });
}
