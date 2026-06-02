import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

const MAX_XP_GRANT = 10000;
const MIN_REASON_LEN = 5;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { userId, amount, reason } = await req.json();
  const amt = Number(amount);
  if (!userId || !Number.isInteger(amt) || amt === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (Math.abs(amt) > MAX_XP_GRANT) {
    return NextResponse.json({ error: "over_limit", limit: MAX_XP_GRANT }, { status: 422 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < MIN_REASON_LEN) {
    return NextResponse.json({ error: "reason_required", minLen: MIN_REASON_LEN }, { status: 400 });
  }
  // 允許 admin 補自己（owner 同時也是 user）、audit 標 self_grant
  const isSelf = userId === gate.userId;

  const admin = createSupabaseAdmin();

  const { data: target } = await admin
    .from("profiles")
    .select("xp, level, username")
    .eq("id", userId)
    .single();
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const newXp = Math.max(0, (target.xp ?? 0) + amt);
  // Lv = floor(sqrt(xp/100))+1, cap 60
  const newLevel = Math.min(60, Math.floor(Math.sqrt(newXp / 100)) + 1);

  // 寫 xp_events（用 service role bypass RLS / field lock）
  const { error: evErr } = await admin.from("xp_events").insert({
    user_id: userId,
    amount: amt,
    reason: `admin_grant:${reason.trim().slice(0, 200)}`,
    meta: {
      source: "admin_grant",
      actor_id: gate.userId,
      actor_username: gate.username,
    },
  });
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  // 直接更新 profile（service role 跳 field_lock trigger）
  const { error: updErr } = await admin
    .from("profiles")
    .update({ xp: newXp, level: newLevel })
    .eq("id", userId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.grant_xp",
    target_type: "user",
    target_id: userId,
    changes: {
      before: { xp: target.xp, level: target.level },
      after: { xp: newXp, level: newLevel },
      ...(isSelf ? { self_grant: true } : {}),
      reason: reason.trim(),
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({
    ok: true,
    delta: amt,
    newXp,
    newLevel,
    leveledUp: newLevel > (target.level ?? 1),
  });
}
