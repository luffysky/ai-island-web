import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listDrafts, createDraft } from "@/lib/creator-engine/drafts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId&limit → { items } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const items = await listDrafts(workspaceId, { limit: Number(sp.get("limit")) || 50 });
  return NextResponse.json({ items });
}

/** POST { workspaceId, workType?, title?, body?, doc?, meta?, fragmentIds? } → { draft } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const body = await req.json().catch(() => ({} as any));
  const workspaceId = String(body.workspaceId ?? "");
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const draft = await createDraft(workspaceId, u.userId, {
    workType: body.workType, title: body.title, body: body.body,
    doc: body.doc, meta: body.meta,
    fragmentIds: Array.isArray(body.fragmentIds) ? body.fragmentIds : undefined,
  });
  return NextResponse.json({ draft });
}
