import { NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { collectionWorkspace, deleteCollection } from "@/lib/creator-engine/collections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function gate(id: string, userId: string) {
  const ws = await collectionWorkspace(id);
  if (!ws) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  const r = await requireWorkspaceRole(ws, userId, "contributor");
  if (r instanceof NextResponse) return { error: r };
  return { ws };
}

/** DELETE → { ok } 刪除分類（碎片本身不刪）。 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gate(id, u.userId);
  if (g.error) return g.error;
  await deleteCollection(id);
  return NextResponse.json({ ok: true });
}
