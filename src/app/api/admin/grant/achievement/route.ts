import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

const MIN_REASON_LEN = 5;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { userId, achievementId, reason } = await req.json();
  if (!userId || !achievementId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < MIN_REASON_LEN) {
    return NextResponse.json({ error: "reason_required", minLen: MIN_REASON_LEN }, { status: 400 });
  }
  // 允許 admin 自己補（owner 也是 user）
  const isSelf = userId === gate.userId;

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
    .select("user_id")
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
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.grant_achievement",
    target_type: "user",
    target_id: userId,
    changes: {
      achievement_id: achievementId,
      achievement_name: ach.name,
      reason: reason.trim(),
      ...(isSelf ? { self_grant: true } : {}),
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
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.revoke_achievement",
    target_type: "user",
    target_id: userId,
    changes: { achievement_id: achievementId, reason: reason.trim() },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true });
}
