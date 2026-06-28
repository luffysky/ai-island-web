import { NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { publishWorkToBlog, workWorkspace } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 發布作品成部落格草稿。{ blogId } */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const ws = await workWorkspace(id);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const gate = await requireWorkspaceRole(ws, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  try {
    const { blogId } = await publishWorkToBlog(id, u.userId);
    return NextResponse.json({ ok: true, blogId });
  } catch (e) {
    return NextResponse.json({ error: "publish_failed", message: (e as Error).message }, { status: 500 });
  }
}
