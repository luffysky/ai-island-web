import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { listListings, createListing } from "@/lib/creator-engine/marketplace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?cursor&limit → { items, nextCursor } 公開上架。 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listListings({ cursor: sp.get("cursor"), limit: Number(sp.get("limit")) || 24 }));
}

/** POST { workspaceId, assetId, assetType, title, priceZ } → { listing }（Owner/Manager 上架）。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const workspaceId = String(b.workspaceId ?? "");
  if (!workspaceId || !b.assetId || !b.assetType || !b.title) return NextResponse.json({ error: "validation", message: "缺欄位" }, { status: 422 });
  const gate = await requireWorkspaceRole(workspaceId, u.userId, "manager");
  if (gate instanceof NextResponse) return gate;
  const listing = await createListing(workspaceId, u.userId, { assetId: b.assetId, assetType: b.assetType, title: b.title, description: b.description, priceZ: Number(b.priceZ) || 0 });
  return NextResponse.json({ listing });
}
