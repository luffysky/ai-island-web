import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getFragmentsByIds } from "@/lib/creator-engine/fragments";
import { evolve, AgentError } from "@/lib/creator-engine/ai/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, fragmentIds[]|fragmentId, count?, direction? } → { variants, agentRunId } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const ids = (Array.isArray(body.fragmentIds) ? body.fragmentIds : [])
    .map((x: unknown) => String(x)).filter(Boolean);
  if (!ids.length && body.fragmentId) ids.push(String(body.fragmentId)); // 舊版單一相容
  if (!workspaceId || !ids.length) return NextResponse.json({ error: "validation", message: "缺 workspaceId / 碎片" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;

  const seeds = await getFragmentsByIds(workspaceId, ids.slice(0, 12)); // 上限 12 個種子
  if (!seeds.length) return NextResponse.json({ error: "not_found", message: "找不到碎片" }, { status: 404 });
  try {
    const { result, agentRunId } = await evolve(workspaceId, u.userId, seeds, Number(body.count) || 6, body.direction);
    return NextResponse.json({ variants: result.variants, agentRunId });
  } catch (e) {
    const st = e instanceof AgentError ? e.status : 500;
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: st });
  }
}
