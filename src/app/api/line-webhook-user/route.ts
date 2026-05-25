import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { consumeBindCode } from "@/lib/notify-user-line";
import { buildQuickReply, type FlexMessage, type LineTextMessage } from "@/lib/line-flex";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENDPOINT = "https://api.line.me/v2/bot";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function lineReply(replyToken: string, text: string, token: string, quickReply?: any) {
  try {
    const msg: any = { type: "text", text: text.slice(0, 4900) };
    if (quickReply) msg.quickReply = quickReply;
    await fetch(`${ENDPOINT}/message/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages: [msg] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // silent
  }
}

const QUICK_REPLY = buildQuickReply([
  { type: "uri", label: "🌐 打開網站", uri: SITE_URL },
  { type: "uri", label: "📚 看章節", uri: `${SITE_URL}/chapters` },
  { type: "uri", label: "⚙️ 設定", uri: `${SITE_URL}/settings` },
  { type: "message", label: "❓ 說明", text: "/help" },
]);

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
    return NextResponse.json({ ok: false, error: "no_user_bot_env" });
  }

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-line-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  for (const ev of body.events ?? []) {
    const replyToken = ev.replyToken;
    const userId = ev.source?.userId as string | undefined;

    if (ev.type === "follow" && replyToken && userId) {
      await lineReply(
        replyToken,
        `🏝️ 歡迎加入 AI 島！\n\n要綁定帳號讓我推學習通知給你：\n1. 到 ${SITE_URL}/settings 拿 6 位綁定 code\n2. 傳給我「/bind 123456」\n\n綁定後完課 / 升等 / 解鎖成就 / 論壇被回覆都會推到你的 LINE。`,
        token,
        QUICK_REPLY,
      );
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text" && replyToken && userId) {
      const text = String(ev.message.text ?? "").trim();

      // 1. 綁定
      const bindMatch = text.match(/^\/?bind\s+(\d{6})$/i);
      if (bindMatch) {
        const result = await consumeBindCode(bindMatch[1], userId);
        if (result.ok) {
          await lineReply(
            replyToken,
            `✅ 綁定成功！\n\n之後會推給你：\n• 完成 lesson\n• 升等\n• 解鎖成就\n• 論壇被回覆\n\n關通知 → 「設定 → LINE 通知」、或傳「/unbind」解除。`,
            token, QUICK_REPLY,
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
            `❌ 綁定失敗：${reasonMap[result.reason ?? ""] ?? result.reason}\n\n到 ${SITE_URL}/settings 重拿 code。`,
            token, QUICK_REPLY,
          );
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
        const msg = error || !count
          ? "🤔 你還沒綁定、或已經解除過了"
          : "✅ 已解除綁定、不再推通知。要重綁、到網站重拿 code。";
        await lineReply(replyToken, msg, token, QUICK_REPLY);
        continue;
      }

      // 3. /help
      if (text === "/help" || text === "help" || text === "說明" || text === "?") {
        await lineReply(
          replyToken,
          `📖 AI 島 LINE 通知 bot\n\n指令：\n• /bind 123456 — 綁帳號\n• /unbind — 解除綁定\n• /help — 看這份\n\n網站：${SITE_URL}\n設定 / 拿 code：${SITE_URL}/settings`,
          token, QUICK_REPLY,
        );
        continue;
      }

      // 4. 其他訊息 — 自動建 ticket + 通知 admin、user 不會找不到人
      const admin = createSupabaseAdmin();

      // 看 LINE userId 對應哪個 profile（若已綁定）
      const { data: profile } = await admin
        .from("profiles")
        .select("id, username, display_name")
        .eq("line_user_id", userId)
        .maybeSingle();

      const senderName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        `LINE訪客${userId.slice(0, 6)}`;

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
