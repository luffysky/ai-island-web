import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listSeries, createSeries } from "@/lib/creator-engine/series";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId&kind → { items } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation", message: "缺 workspaceId" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  const items = await listSeries(workspaceId, sp.get("kind") || undefined);
  return NextResponse.json({ items });
}

/** POST { workspaceId, kind?, title, description?, category?, coverUrl? } → { series } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const title = String(b.title ?? "").trim();
  if (!workspaceId || !title) return NextResponse.json({ error: "validation", message: "缺 workspaceId / title" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  const series = await createSeries(workspaceId, u.userId, {
    kind: b.kind, title, description: b.description, category: b.category, coverUrl: b.coverUrl,
  });
  return NextResponse.json({ series });
}
