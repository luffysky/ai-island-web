import { NextRequest, NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/orders/[id]/refund
 *
 * 把一筆訂單標記為 refunded + 寫 refunded_at + audit_log。
 *
 * ⚠️ 這只是「系統帳面上」記錄退款、方便對帳與統計。
 *    真正把錢退回信用卡 / ATM 要在金流商後台手動操作、本 API 不碰金流。
 *
 * body: { reason?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 金流敏感操作：owner/admin 或 finance 角色可執行；其他 scoped 角色 403。
  const gate = await requireAdminSection("finance");
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const reason = String(body.reason ?? "").trim().slice(0, 300);

  const admin = createSupabaseAdmin();

  // 先撈訂單、確認狀態合法（只有已付款才能退）
  const { data: order, error: fetchErr } = await admin
    .from("orders")
    .select("id, order_no, status, amount, user_id, product_name, refunded_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const o = order as any;
  if (o.status === "refunded") {
    return NextResponse.json({ error: "already_refunded" }, { status: 409 });
  }
  if (o.status !== "paid") {
    return NextResponse.json(
      { error: "not_refundable", hint: `只有 paid 訂單可退、目前狀態=${o.status}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("orders")
    .update({ status: "refunded", refunded_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "paid"); // 樂觀鎖：避免併發重複退
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // audit
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.order_refund",
    target_type: "order",
    target_id: id,
    changes: {
      order_no: o.order_no,
      amount: o.amount,
      product_name: o.product_name,
      user_id: o.user_id,
      reason: reason || null,
      note: "帳面標記退款；實際金流退款需在金流商後台手動處理",
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  // 通知（refund 是 LINE 優先 kind）
  await notifyAdmin({
    kind: "refund",
    dedupeKey: `refund:${id}`,
    text: `💸 訂單退款（帳面）\n訂單 ${o.order_no}｜NT$ ${Number(o.amount).toLocaleString()}｜${o.product_name}\n操作者：${gate.username ?? gate.userId}${reason ? `\n原因：${reason}` : ""}\n\n提醒：實際金流退款請到金流商後台手動處理。`,
  });

  return NextResponse.json({
    ok: true,
    id,
    status: "refunded",
    refunded_at: now,
    note: "帳面已標記退款；請至金流商後台完成實際退款",
  });
}
