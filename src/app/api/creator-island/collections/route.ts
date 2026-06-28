import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listCollectionsWithItems, createCollection } from "@/lib/creator-engine/collections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?workspaceId → { collections } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "validation" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "viewer");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ collections: await listCollectionsWithItems(workspaceId) });
}

/** POST { workspaceId, name } → { collection } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  const name = String(b.name ?? "").trim();
  if (!workspaceId || !name) return NextResponse.json({ error: "validation", message: "缺 name" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "contributor");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ collection: await createCollection(workspaceId, u.userId, name) });
}
