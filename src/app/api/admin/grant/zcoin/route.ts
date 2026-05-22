import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

const MAX_GRANT = 5000;
const MIN_REASON_LEN = 5;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId, amount, reason } = await req.json();
  const amt = Number(amount);
  if (!userId || !Number.isInteger(amt) || amt === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (Math.abs(amt) > MAX_GRANT) {
    return NextResponse.json({ error: "over_limit", limit: MAX_GRANT }, { status: 422 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < MIN_REASON_LEN) {
    return NextResponse.json({ error: "reason_required", minLen: MIN_REASON_LEN }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "cannot_target_self" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: target } = await admin
    .from("profiles")
    .select("z_coin, username")
    .eq("id", userId)
    .single();
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const newBalance = (target.z_coin ?? 0) + amt;
  if (newBalance < 0) {
    return NextResponse.json({
      error: "insufficient_balance",
      currentBalance: target.z_coin ?? 0,
    }, { status: 422 });
  }

  const { error: txErr } = await admin.from("coin_transactions").insert({
    user_id: userId,
    type: amt > 0 ? "admin_grant" : "admin_deduct",
    amount: amt,
    reason: `admin_grant:${reason.trim().slice(0, 200)}`,
    meta: {
      source: "admin_grant",
      actor_id: user.id,
      actor_username: me.username,
    },
  });
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const { error: updErr } = await admin
    .from("profiles")
    .update({ z_coin: newBalance })
    .eq("id", userId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "admin.grant_zcoin",
    target_type: "user",
    target_id: userId,
    changes: {
      before: { z_coin: target.z_coin },
      after: { z_coin: newBalance },
      reason: reason.trim(),
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true, delta: amt, newBalance });
}
