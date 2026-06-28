import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { toUserId } → 轉移擁有權（僅 owner）。原子 RPC、保證剛好一個 owner。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const gate = await requireWorkspaceRole(id, u.userId, "owner");
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({} as any));
  const toUserId = String(body.toUserId ?? "");
  if (!toUserId) return NextResponse.json({ error: "validation", message: "缺 toUserId" }, { status: 422 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("ci_transfer_workspace_owner", {
    p_workspace_id: id,
    p_to_user_id: toUserId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = data as { ok: boolean; error?: string };
  if (!res?.ok) return NextResponse.json({ error: res?.error ?? "transfer_failed" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
