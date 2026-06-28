import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getFragmentsByIds } from "@/lib/creator-engine/fragments";
import { evolve, AgentError } from "@/lib/creator-engine/ai/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, fragmentId, count?, direction? } → { variants, agentRunId } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const fragmentId = String(body.fragmentId ?? "");
  if (!workspaceId || !fragmentId) return NextResponse.json({ error: "validation", message: "缺 workspaceId / fragmentId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const [seed] = await getFragmentsByIds(workspaceId, [fragmentId]);
  if (!seed) return NextResponse.json({ error: "not_found", message: "找不到碎片" }, { status: 404 });
  try {
    const { result, agentRunId } = await evolve(workspaceId, u.userId, seed, Number(body.count) || 5, body.direction);
    return NextResponse.json({ variants: result.variants, agentRunId });
  } catch (e) {
    const st = e instanceof AgentError ? e.status : 500;
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: st });
  }
}
