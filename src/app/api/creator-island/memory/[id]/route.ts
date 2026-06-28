import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { memoryById, setMemoryStatus, deleteMemory } from "@/lib/creator-engine/memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function gate(id: string, userId: string) {
  const m = await memoryById(id);
  if (!m) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (m.scope === "personal") {
    if (m.user_id !== userId) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  } else {
    const r = await requireWorkspaceRole(m.workspace_id ?? "", userId, "contributor");
    if (r instanceof NextResponse) return { error: r };
  }
  return { m };
}

/** PATCH { status:'active'|'rejected' } → { ok } 確認/拒絕記憶。 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gate(id, u.userId);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({} as any));
  const status = body.status === "rejected" ? "rejected" : "active";
  await setMemoryStatus(id, status);
  return NextResponse.json({ ok: true });
}

/** DELETE → { ok } */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gate(id, u.userId);
  if (g.error) return g.error;
  await deleteMemory(id);
  return NextResponse.json({ ok: true });
}
