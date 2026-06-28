import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listFragments, createFragment } from "@/lib/creator-engine/fragments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId&cursor&q&tag&limit → { items, nextCursor } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const res = await listFragments(workspaceId, {
    cursor: sp.get("cursor"),
    q: sp.get("q"),
    tag: sp.get("tag"),
    limit: Number(sp.get("limit")) || 20,
  });
  return NextResponse.json(res);
}

/** POST { workspaceId, title, content?, tags?, sourceType? } → { fragment } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  const title = String(body.title ?? "").trim();
  if (!workspaceId || !title) return NextResponse.json({ error: "validation", message: "缺 workspaceId / title" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const fragment = await createFragment(workspaceId, u.userId, {
    title,
    content: body.content,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    sourceType: body.sourceType,
  });
  return NextResponse.json({ fragment });
}
