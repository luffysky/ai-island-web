import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getDraft, publishDraftToWork } from "@/lib/creator-engine/drafts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → { workId }：草稿完稿存成 ci_works。 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(draft.workspace_id, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  try {
    const { workId } = await publishDraftToWork(id, u.userId);
    return NextResponse.json({ workId });
  } catch (e) {
    return NextResponse.json({ error: "publish_failed", message: (e as Error).message }, { status: 500 });
  }
}
