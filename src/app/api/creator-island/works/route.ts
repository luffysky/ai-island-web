import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listWorks, createWork } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId&cursor&limit → { items, nextCursor } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const res = await listWorks(workspaceId, { cursor: sp.get("cursor"), limit: Number(sp.get("limit")) || 20 });
  return NextResponse.json(res);
}

/** POST { workspaceId, title, workType?, body?, fragmentIds? } → { work } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const title = String(body.title ?? "").trim();
  if (!workspaceId || !title) return NextResponse.json({ error: "validation", message: "缺 workspaceId / title" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const work = await createWork(workspaceId, u.userId, {
    title,
    workType: body.workType,
    body: body.body,
    fragmentIds: Array.isArray(body.fragmentIds) ? body.fragmentIds : undefined,
    sourceType: body.sourceType,
  });
  return NextResponse.json({ work });
}
