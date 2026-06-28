import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { updateFragment, deleteFragment, fragmentWorkspace } from "@/lib/creator-engine/fragments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function gateFragment(id: string, userId: string) {
  const ws = await fragmentWorkspace(id);
  if (!ws) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  const role = await requireWorkspaceRole(ws, userId, "contributor");
  if (role instanceof NextResponse) return { error: role };
  return { ws };
}

/** PATCH { title?, content?, tags?, mood?, category? } → { fragment } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gateFragment(id, u.userId);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({} as any));
  const fragment = await updateFragment(id, body);
  return NextResponse.json({ fragment });
}

/** DELETE → { ok } */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await gateFragment(id, u.userId);
  if (g.error) return g.error;
  await deleteFragment(id);
  return NextResponse.json({ ok: true });
}
