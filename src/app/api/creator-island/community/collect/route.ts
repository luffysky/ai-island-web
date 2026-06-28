import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { toggleCollect } from "@/lib/creator-engine/community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { assetId, assetType } → { on } 切換收藏。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  if (!b.assetId || !b.assetType) return NextResponse.json({ error: "validation" }, { status: 422 });
  return NextResponse.json(await toggleCollect(u.userId, String(b.assetId), String(b.assetType)));
}
