import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getFragmentsByIds } from "@/lib/creator-engine/fragments";
import { synthesize, AgentError } from "@/lib/creator-engine/ai/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, fragmentIds[>=2] } → { result, agentRunId } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const ids: string[] = Array.isArray(body.fragmentIds) ? body.fragmentIds : [];
  if (!workspaceId || ids.length < 2) return NextResponse.json({ error: "validation", message: "至少選 2 個碎片" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const frags = await getFragmentsByIds(workspaceId, ids);
  if (frags.length < 2) return NextResponse.json({ error: "validation", message: "碎片不足" }, { status: 422 });
  try {
    const { result, agentRunId } = await synthesize(workspaceId, u.userId, frags);
    return NextResponse.json({ result, agentRunId });
  } catch (e) {
    const st = e instanceof AgentError ? e.status : 500;
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: st });
  }
}
