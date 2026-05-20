import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

// POST /api/admin/users/role { userId, role: 'member' | 'editor' | 'admin' }
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 確認操作者是 admin
  const { data: me } = await supabase.from("profiles").select("role, username").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !["member", "editor", "admin"].includes(role)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 不可改自己（避免誤刪 admin）
  if (userId === user.id) {
    return NextResponse.json({ error: "cannot_change_self" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 取目標 user 資訊 (audit log 用)
  const { data: target } = await admin
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .single();

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "user.role_changed",
    target_type: "user",
    target_id: userId,
    changes: { before: { role: target?.role }, after: { role } },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true });
}
