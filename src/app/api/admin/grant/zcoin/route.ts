import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

const MAX_GRANT = 5000;
const MIN_REASON_LEN = 5;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
  // 允許 admin 補自己（owner 同時也是 user 的情境）、但 audit 標記
  const isSelf = userId === gate.userId;

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

  // coin_transactions schema: id / user_id / amount / balance_after / reason / meta / created_at
  // 沒 type 欄位、tx 類型放 meta.tx_type
  const { error: txErr } = await admin.from("coin_transactions").insert({
    user_id: userId,
    amount: amt,
    balance_after: newBalance,
    reason: `admin_grant:${reason.trim().slice(0, 200)}`,
    meta: {
      source: "admin_grant",
      tx_type: amt > 0 ? "admin_grant" : "admin_deduct",
      actor_id: gate.userId,
      actor_username: gate.username,
      ...(isSelf ? { self_grant: true } : {}),
    },
  });
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const { error: updErr } = await admin
    .from("profiles")
    .update({ z_coin: newBalance })
    .eq("id", userId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.grant_zcoin",
    target_type: "user",
    target_id: userId,
    changes: {
      before: { z_coin: target.z_coin },
      after: { z_coin: newBalance },
      reason: reason.trim(),
      ...(isSelf ? { self_grant: true } : {}),
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true, delta: amt, newBalance });
}
