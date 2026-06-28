import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { respondRequest } from "@/lib/creator-engine/friends";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { friendshipId, accept } 回應好友邀請 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  if (!b.friendshipId) return NextResponse.json({ error: "validation" }, { status: 422 });
  try { return NextResponse.json(await respondRequest(String(b.friendshipId), u.userId, !!b.accept)); }
  catch (e) { return NextResponse.json({ error: "fail", message: (e as Error).message }, { status: 400 }); }
}
