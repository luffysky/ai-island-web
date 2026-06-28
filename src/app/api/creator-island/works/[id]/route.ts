import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getWork, updateWork, workWorkspace, workFragmentIds } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { work, fragmentIds } */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const ws = await workWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(ws, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const work = await getWork(id);
  const fragmentIds = await workFragmentIds(id);
  return NextResponse.json({ work, fragmentIds });
}

/** PATCH { title?, body?, status?, workType?, meta? } → { work } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const ws = await workWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(ws, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const body = await req.json().catch(() => ({} as any));
  const work = await updateWork(id, body);
  return NextResponse.json({ work });
}
