import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

// POST /api/admin/users/ai-unlimited { userId, enabled: boolean }
// 總後台開關「指定帳號」AI 無限額度特權
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 確認操作者是 admin
  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId, enabled } = await req.json();
  if (!userId || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 確認目標存在
  const { data: target } = await admin
    .from("profiles")
    .select("username, ai_unlimited")
    .eq("id", userId)
    .single();
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const patch = enabled
    ? { ai_unlimited: true, ai_unlimited_at: new Date().toISOString(), ai_unlimited_by: user.id }
    : { ai_unlimited: false, ai_unlimited_at: null, ai_unlimited_by: null };

  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: enabled ? "user.ai_unlimited_enable" : "user.ai_unlimited_disable",
    target_type: "user",
    target_id: userId,
    changes: { before: { ai_unlimited: target.ai_unlimited }, after: { ai_unlimited: enabled } },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true, userId, ai_unlimited: enabled });
}
