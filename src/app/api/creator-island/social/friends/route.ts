import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { searchUsers, sendRequest, listFriends, listPending, removeFriend } from "@/lib/creator-engine/friends";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?type=friends|pending|search&q= */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "friends";
  if (type === "search") return NextResponse.json({ users: await searchUsers(sp.get("q") ?? "", u.userId) });
  if (type === "pending") return NextResponse.json({ pending: await listPending(u.userId) });
  return NextResponse.json({ friends: await listFriends(u.userId) });
}

/** POST { addresseeId } 送好友邀請 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  if (!b.addresseeId) return NextResponse.json({ error: "validation" }, { status: 422 });
  try { return NextResponse.json(await sendRequest(u.userId, String(b.addresseeId))); }
  catch (e) { return NextResponse.json({ error: "fail", message: (e as Error).message }, { status: 400 }); }
}

/** DELETE ?otherId 解除好友 */
export async function DELETE(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const otherId = req.nextUrl.searchParams.get("otherId") ?? "";
  if (!otherId) return NextResponse.json({ error: "validation" }, { status: 422 });
  await removeFriend(u.userId, otherId);
  return NextResponse.json({ ok: true });
}
