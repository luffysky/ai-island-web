import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

const MAX_XP_GRANT = 10000;
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
  if (Math.abs(amt) > MAX_XP_GRANT) {
    return NextResponse.json({ error: "over_limit", limit: MAX_XP_GRANT }, { status: 422 });
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
      actor_id: user.id,
      actor_username: me.username,
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
    actor_id: user.id,
    actor_username: me.username,
    action: "admin.grant_xp",
    target_type: "user",
    target_id: userId,
    changes: {
      before: { xp: target.xp, level: target.level },
      after: { xp: newXp, level: newLevel },
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
