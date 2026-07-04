import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { runReasoning } from "@/lib/creator-engine/fie/reason";
import { bumpCreatorXp } from "@/lib/creator-engine/growth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId, seedFragmentIds[>=1], mode?, intent?, maxCandidates? } → { runId, mode, observation, candidates[] } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const seedFragmentIds: string[] = Array.isArray(b.seedFragmentIds) ? b.seedFragmentIds.filter((x: any) => typeof x === "string") : [];
  if (!workspaceId || seedFragmentIds.length < 1) return NextResponse.json({ error: "validation", message: "缺 workspaceId / 至少 1 個碎片" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  try {
    const result = await runReasoning({ workspaceId, userId: u.userId, seedFragmentIds, mode: b.mode, intent: b.intent, maxCandidates: b.maxCandidates });
    void bumpCreatorXp(u.userId, 5); // #91 完成一次推理 +5 Creator XP
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "reason_failed", message: (e as Error).message }, { status: 502 });
  }
}
