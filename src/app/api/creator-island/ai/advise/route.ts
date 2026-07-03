import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getFragmentsByIds } from "@/lib/creator-engine/fragments";
import { advise, AgentError } from "@/lib/creator-engine/ai/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, fragmentIds[] } → { insight, suggestions[] } 這些碎片適合做什麼。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const allIds = (Array.isArray(b.fragmentIds) ? b.fragmentIds : []).map((x: unknown) => String(x)).filter(Boolean);
  if (!workspaceId || !allIds.length) return NextResponse.json({ error: "validation", message: "缺碎片" }, { status: 422 });
  // 全選可能上百個 → 均勻抽樣最多 60 個代表，控成本又保留多樣性
  const CAP = 60;
  const ids = allIds.length <= CAP ? allIds
    : Array.from({ length: CAP }, (_, i) => allIds[Math.floor((i * allIds.length) / CAP)]);
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const frags = await getFragmentsByIds(workspaceId, ids);
  if (!frags.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const { result } = await advise(workspaceId, u.userId, frags as any);
    return NextResponse.json(result);
  } catch (e) {
    const st = e instanceof AgentError ? e.status : 500;
    return NextResponse.json({ error: "ai", message: (e as Error).message }, { status: st });
  }
}
