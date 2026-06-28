import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ASSIGNABLE = ["manager", "contributor", "viewer"] as const;

/** GET → { members } 工作空間成員列表（成員可看）。 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const gate = await requireWorkspaceRole(id, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ci_workspace_members")
    .select("user_id, role, joined_at, profile:profiles(username, display_name)")
    .eq("workspace_id", id)
    .order("joined_at", { ascending: true });
  return NextResponse.json({ members: data ?? [] });
}

/** POST { userId, role } → 直接加成員（owner/manager）。一般加入走邀請碼。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const gate = await requireWorkspaceRole(id, u.userId, "manager");
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({} as any));
  const userId = String(body.userId ?? "");
  const role = String(body.role ?? "contributor");
  if (!userId) return NextResponse.json({ error: "validation", message: "缺 userId" }, { status: 422 });
  if (!ASSIGNABLE.includes(role as any)) return NextResponse.json({ error: "validation", message: "角色不可指定為 owner" }, { status: 422 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ci_workspace_members")
    .upsert({ workspace_id: id, user_id: userId, role, invited_by: u.userId }, { onConflict: "workspace_id,user_id" })
    .select("user_id, role")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ member: data });
}
