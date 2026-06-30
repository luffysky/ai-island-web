import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { getDraft, updateDraft, deleteDraft } from "@/lib/creator-engine/drafts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(id: string, userId: string, min: "viewer" | "contributor") {
  const draft = await getDraft(id);
  if (!draft) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  const gate = await requireWorkspaceRole(draft.workspace_id, userId, min);
  if (gate instanceof NextResponse) return { error: gate };
  return { draft };
}

/** GET → { draft } */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId, "viewer");
  if (g.error) return g.error;
  return NextResponse.json({ draft: g.draft });
}

/** PATCH { title?, body?, doc?, meta?, workType?, status?, fragmentIds? } → { draft } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId, "contributor");
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({} as any));
  const draft = await updateDraft(id, {
    title: body.title, body: body.body, doc: body.doc, meta: body.meta,
    work_type: body.workType, status: body.status,
    fragmentIds: Array.isArray(body.fragmentIds) ? body.fragmentIds : undefined,
    seriesId: body.seriesId === undefined ? undefined : (body.seriesId || null),
    seriesOrder: typeof body.seriesOrder === "number" ? body.seriesOrder : undefined,
  });
  return NextResponse.json({ draft });
}

/** DELETE → { ok } */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId, "contributor");
  if (g.error) return g.error;
  await deleteDraft(id);
  return NextResponse.json({ ok: true });
}
