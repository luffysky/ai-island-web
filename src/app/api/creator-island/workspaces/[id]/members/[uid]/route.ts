import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ASSIGNABLE = ["manager", "contributor", "viewer"] as const;

/** PATCH { role } → 改成員角色（owner/manager；不可改成/改動 owner）。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; uid: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id, uid } = await params;
  const gate = await requireWorkspaceRole(id, u.userId, "manager");
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({} as any));
  const role = String(body.role ?? "");
  if (!ASSIGNABLE.includes(role as any)) {
    return NextResponse.json({ error: "validation", message: "角色不可設為 owner（請用轉移擁有權）" }, { status: 422 });
  }

  const admin = createSupabaseAdmin();
  // 不能改到 owner 那列
  const { data: target } = await admin
    .from("ci_workspace_members").select("role").eq("workspace_id", id).eq("user_id", uid).maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((target as any).role === "owner") {
    return NextResponse.json({ error: "conflict", message: "不能變更 owner，請用轉移擁有權" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("ci_workspace_members").update({ role }).eq("workspace_id", id).eq("user_id", uid)
    .select("user_id, role").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

/** DELETE → 移除成員（owner/manager；不能移除 owner）。 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; uid: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id, uid } = await params;
  const gate = await requireWorkspaceRole(id, u.userId, "manager");
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseAdmin();
  const { data: target } = await admin
    .from("ci_workspace_members").select("role").eq("workspace_id", id).eq("user_id", uid).maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((target as any).role === "owner") {
    return NextResponse.json({ error: "conflict", message: "不能移除 owner，請先轉移擁有權" }, { status: 409 });
  }

  const { error } = await admin.from("ci_workspace_members").delete().eq("workspace_id", id).eq("user_id", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
