import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { runWorkflow, workflowWorkspace } from "@/lib/creator-engine/workflows";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** POST { fragmentIds[] } → { runId, results } 重播工作流。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const ws = await workflowWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(ws, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const body = await req.json().catch(() => ({} as any));
  const fragmentIds = Array.isArray(body.fragmentIds) ? body.fragmentIds : [];
  const r = await runWorkflow(ws, u.userId, id, fragmentIds);
  return NextResponse.json(r);
}
