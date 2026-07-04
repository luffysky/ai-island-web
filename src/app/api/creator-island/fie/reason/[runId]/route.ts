import { NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getReasoningRun } from "@/lib/creator-engine/fie/feedback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { run, candidates[], trace[] } 一次推理的完整回放（Reasoning Trace）。 */
export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { runId } = await params;
  const data = await getReasoningRun(runId);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole((data.run as any).workspace_id, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json(data);
}
