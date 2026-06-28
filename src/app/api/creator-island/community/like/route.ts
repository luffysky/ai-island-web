import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { toggleLike } from "@/lib/creator-engine/community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { assetId } → { on } 切換讚。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  if (!b.assetId) return NextResponse.json({ error: "validation" }, { status: 422 });
  return NextResponse.json(await toggleLike(u.userId, String(b.assetId)));
}
