import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { backfillWorkspaceEmbeddings, surprisingPairs } from "@/lib/creator-engine/embeddings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { workspaceId } → { pairs }（先補向量再找意外配對，E5）。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  await backfillWorkspaceEmbeddings(workspaceId).catch(() => {});
  const pairs = await surprisingPairs(workspaceId);
  return NextResponse.json({ pairs });
}
