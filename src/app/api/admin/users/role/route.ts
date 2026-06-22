import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

// POST /api/admin/users/role { userId, role: 'member' | 'editor' | 'admin' }
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { userId, role } = await req.json();
  if (!userId || !["member", "editor", "admin", "owner"].includes(role)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 不可改自己（避免誤刪 admin）
  if (userId === gate.userId) {
    return NextResponse.json({ error: "cannot_change_self" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 取目標 user 資訊 (audit log 用)
  const { data: target } = await admin
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .single();

  // owner 只有 owner 能授予 / 撤銷（一般 admin 不能碰 owner、也不能把人設成 owner）
  if ((role === "owner" || target?.role === "owner") && !gate.isOwner) {
    return NextResponse.json({ error: "only_owner_can_set_owner" }, { status: 403 });
  }

  // 同步 is_owner 旗標（checkOwner 以這個為最權威）
  const { error } = await admin
    .from("profiles")
    .update({ role, is_owner: role === "owner" })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "user.role_changed",
    target_type: "user",
    target_id: userId,
    changes: { before: { role: target?.role }, after: { role } },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true });
}
