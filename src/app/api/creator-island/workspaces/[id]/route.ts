import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** DELETE → 刪除 workspace（僅 owner、僅 studio；personal 不可刪）。 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;

  const gate = await requireWorkspaceRole(id, u.userId, "owner");
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseAdmin();
  const { data: ws } = await admin.from("ci_workspaces").select("type").eq("id", id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((ws as any).type === "personal") {
    return NextResponse.json({ error: "conflict", message: "個人工作空間不可刪除" }, { status: 409 });
  }

  const { error } = await admin.from("ci_workspaces").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
