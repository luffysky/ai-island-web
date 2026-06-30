import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { seriesWorkspace, updateSeries, deleteSeries } from "@/lib/creator-engine/series";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(id: string, userId: string) {
  const ws = await seriesWorkspace(id);
  if (!ws) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  const gate = await requireWorkspaceRole(ws, userId, "contributor");
  if (gate instanceof NextResponse) return { error: gate };
  return { ws };
}

/** PATCH { title?, description?, category?, coverUrl? } → { series } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId);
  if (g.error) return g.error;
  const b = await req.json().catch(() => ({} as any));
  const series = await updateSeries(id, { title: b.title, description: b.description, category: b.category, cover_url: b.coverUrl });
  return NextResponse.json({ series });
}

/** DELETE → { ok }（解除歸屬、不刪草稿/作品） */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const g = await guard(id, u.userId);
  if (g.error) return g.error;
  await deleteSeries(id);
  return NextResponse.json({ ok: true });
}
