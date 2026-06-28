import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { relatedFragments } from "@/lib/creator-engine/embeddings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** GET ?workspaceId&fragmentId → { related }（主動回憶，E4）。 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  const fragmentId = sp.get("fragmentId") ?? "";
  if (!workspaceId || !fragmentId) return NextResponse.json({ error: "validation", message: "缺參數" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const related = await relatedFragments(workspaceId, fragmentId);
  return NextResponse.json({ related });
}
