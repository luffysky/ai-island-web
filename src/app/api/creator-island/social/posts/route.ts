import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listFeed, createPost, friendIds } from "@/lib/creator-engine/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?scope=mine|friends|public &cursor&type → { items, nextCursor } 動態牆 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  const base = { cursor: sp.get("cursor"), type: sp.get("type"), limit: Number(sp.get("limit")) || 15 };
  const scope = sp.get("scope");
  if (scope === "mine") return NextResponse.json(await listFeed({ ...base, userId: u.userId }));
  if (scope === "friends") return NextResponse.json(await listFeed({ ...base, authorIds: await friendIds(u.userId) }));
  if (scope === "public") return NextResponse.json(await listFeed({ ...base, publicOnly: true }));
  return NextResponse.json(await listFeed({ ...base, userId: sp.get("userId") }));
}

/** POST { type, content, images[], videoUrl, audioUrl, tags[], visibility } → { post } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const hasContent = (b.content && String(b.content).trim()) || (b.images?.length) || b.videoUrl || b.audioUrl;
  if (!hasContent) return NextResponse.json({ error: "validation", message: "貼文要有文字或媒體" }, { status: 422 });
  const post = await createPost(u.userId, b);
  return NextResponse.json({ post });
}
