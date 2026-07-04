import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listUsedMemories } from "@/lib/creator-engine/memory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?runId → { memories } 這次 AI 動作(agentRunId)實際注入了哪些記憶（透明化，#92）。 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const runId = Number(req.nextUrl.searchParams.get("runId"));
  if (!Number.isFinite(runId)) return NextResponse.json({ error: "validation", message: "缺 runId" }, { status: 422 });
  return NextResponse.json({ memories: await listUsedMemories(runId) });
}
