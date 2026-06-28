import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { toggleFollow } from "@/lib/creator-engine/community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { targetType:'creator'|'studio', targetId } → { on } 切換追蹤。 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const targetType = b.targetType === "studio" ? "studio" : "creator";
  if (!b.targetId) return NextResponse.json({ error: "validation" }, { status: 422 });
  return NextResponse.json(await toggleFollow(u.userId, targetType, String(b.targetId)));
}
