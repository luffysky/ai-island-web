import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

// 網站後台可指派的角色（scoped RBAC）。member/editor 為前台/內容編輯的既有角色、保留。
// owner/admin = 高權限（只有 owner 能授予）；support/marketing/finance/content = scoped。
const ASSIGNABLE_ROLES = [
  "member",
  "editor",
  "admin",
  "owner",
  "support",
  "marketing",
  "finance",
  "content",
];
// 高權限角色：授予 or 撤銷都必須 owner 本人（防止一般 admin 自我/互相提權）。
const PRIVILEGED_ROLES = ["owner", "admin"];

// POST /api/admin/users/role { userId, role }
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { userId, role } = await req.json();
  if (!userId || !ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 不可改自己（避免誤刪 admin / 自我提權）
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

  // 提權防護：把人設成 owner/admin、或動到現有 owner/admin 的角色 → 只有 owner 本人可以。
  // （一般 admin 只能指派 scoped 角色 support/marketing/finance/content 與 member/editor）
  const touchesPrivileged =
    PRIVILEGED_ROLES.includes(role) ||
    (target?.role != null && PRIVILEGED_ROLES.includes(target.role));
  if (touchesPrivileged && !gate.isOwner) {
    return NextResponse.json({ error: "only_owner_can_set_privileged" }, { status: 403 });
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
