import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

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

  const { userId, achievementId, reason } = await req.json();
  if (!userId || !achievementId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
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
    .select("username")
    .eq("id", userId)
    .single();
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const { data: ach } = await admin
    .from("achievements")
    .select("id, name, xp_reward, z_coin_reward")
    .eq("id", achievementId)
    .single();
  if (!ach) {
    return NextResponse.json({ error: "achievement_not_found" }, { status: 404 });
  }

  // 已擁有就不再發
  const { data: existing } = await admin
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "already_owned" }, { status: 409 });
  }

  const { error: insErr } = await admin.from("user_achievements").insert({
    user_id: userId,
    achievement_id: achievementId,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "admin.grant_achievement",
    target_type: "user",
    target_id: userId,
    changes: {
      achievement_id: achievementId,
      achievement_name: ach.name,
      reason: reason.trim(),
    },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({
    ok: true,
    achievement: { id: ach.id, name: ach.name },
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId, achievementId, reason } = await req.json();
  if (!userId || !achievementId || !reason || reason.trim().length < MIN_REASON_LEN) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("user_achievements")
    .delete()
    .eq("user_id", userId)
    .eq("achievement_id", achievementId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "admin.revoke_achievement",
    target_type: "user",
    target_id: userId,
    changes: { achievement_id: achievementId, reason: reason.trim() },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true });
}
