import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { collectionWorkspace, addToCollection, removeFromCollection } from "@/lib/creator-engine/collections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function gate(id: string, userId: string) {
  const ws = await collectionWorkspace(id);
  if (!ws) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  const r = await requireWorkspaceRole(ws, userId, "contributor");
  if (r instanceof NextResponse) return { error: r };
  return { ws };
}

/** POST { assetId, assetType } → 加入分類（拖曳複製）。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gate(id, u.userId);
  if (g.error) return g.error;
  const b = await req.json().catch(() => ({} as any));
  if (!b.assetId) return NextResponse.json({ error: "validation" }, { status: 422 });
  await addToCollection(id, String(b.assetId), String(b.assetType ?? "fragment"));
  return NextResponse.json({ ok: true });
}

/** DELETE ?assetId → 從分類移除。 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gate(id, u.userId);
  if (g.error) return g.error;
  const assetId = req.nextUrl.searchParams.get("assetId") ?? "";
  if (!assetId) return NextResponse.json({ error: "validation" }, { status: 422 });
  await removeFromCollection(id, assetId);
  return NextResponse.json({ ok: true });
}
