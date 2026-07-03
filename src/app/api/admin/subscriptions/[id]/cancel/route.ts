import { NextRequest, NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/subscriptions/[id]/cancel
 *
 * 把一筆訂閱標記為 cancelled + 寫 cancelled_at + audit_log。
 *
 * ⚠️ 只改系統帳面狀態、不會去金流商取消自動扣款。
 *    若是綁定信用卡的定期定額、還要去金流商後台停止扣款。
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

  const { data: sub, error: fetchErr } = await admin
    .from("subscriptions")
    .select("id, user_id, plan, plan_price, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!sub) return NextResponse.json({ error: "subscription_not_found" }, { status: 404 });

  const s = sub as any;
  if (s.status === "cancelled") {
    return NextResponse.json({ error: "already_cancelled" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .eq("id", id)
    .neq("status", "cancelled");
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.subscription_cancel",
    target_type: "subscription",
    target_id: id,
    changes: {
      user_id: s.user_id,
      plan: s.plan,
      plan_price: s.plan_price,
      prev_status: s.status,
      reason: reason || null,
      note: "帳面標記取消；金流商定期扣款需另外停止",
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  await notifyAdmin({
    kind: "order",
    dedupeKey: `sub_cancel:${id}`,
    text: `🚫 訂閱取消（帳面）\n方案 ${s.plan}｜NT$ ${Number(s.plan_price ?? 0).toLocaleString()}/期\n操作者：${gate.username ?? gate.userId}${reason ? `\n原因：${reason}` : ""}\n\n提醒：若為定期定額、請到金流商後台停止扣款。`,
  });

  return NextResponse.json({
    ok: true,
    id,
    status: "cancelled",
    cancelled_at: now,
    note: "帳面已標記取消；定期扣款請至金流商後台停止",
  });
}
