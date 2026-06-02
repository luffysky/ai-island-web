import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyUserLine } from "@/lib/notify-user-line";
import { buildSimpleCard } from "@/lib/line-flex";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff(["admin", "teacher", "assistant"]);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ticket_messages").insert({
    ticket_id: id,
    author_id: gate.userId,
    sender_id: gate.userId,
    author_type: "admin",
    sender_type: "admin",
    is_staff: true,
    body: text.slice(0, 5000),
    content: text.slice(0, 5000),
  });
  if (error) {
    console.error("[ticket reply] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("tickets").update({
    status: "waiting_user",
    assigned_to: gate.userId,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  // 拿 ticket 完整資訊、決定要不要推 LINE 通知 user
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, user_id, subject, meta")
    .eq("id", id)
    .single();

  const meta = (ticket as any)?.meta ?? {};
  const ticketNo = String((ticket as any)?.id ?? id).slice(0, 8);
  const replyText = `💬 客服回覆 ticket #${ticketNo}\n\n${text.slice(0, 1500)}\n\n看完整對話：${SITE_URL}/me/support`;
  // 美化成 Flex 卡片（純文字當 fallback）
  const replyCard = buildSimpleCard({
    emoji: "💬",
    title: "客服回覆",
    accentColor: "#22c55e",
    meta: [{ label: "Ticket", value: `#${ticketNo}` }],
    body: text.slice(0, 1500),
    buttons: [{ label: "📝 看完整對話", uri: `${SITE_URL}/me/support`, primary: true }],
  });

  // 路徑 A：已綁定 user → 走 notifyUserLine（會 check line_user_id + line_notify_enabled）
  if ((ticket as any)?.user_id) {
    notifyUserLine({
      userId: (ticket as any).user_id,
      text: replyText,
      flex: replyCard,
    }).catch(() => {});
  }

  // 路徑 B：未綁定但 ticket 從 LINE 訪客來（只有 lineUserId、profile.user_id null）
  // → 直接用 USER bot push 那個 LINE userId
  const lineUid = meta.line_user_id as string | undefined;
  if (!(ticket as any)?.user_id && lineUid && meta.source === "user_line_bot") {
    const userToken = process.env.USER_LINE_CHANNEL_TOKEN;
    if (userToken) {
      fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lineUid,
          messages: [replyCard],
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
