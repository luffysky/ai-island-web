import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listFeed, createPost } from "@/lib/creator-engine/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?cursor&type&userId → { items, nextCursor } 動態牆 */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listFeed({ cursor: sp.get("cursor"), type: sp.get("type"), userId: sp.get("userId"), limit: Number(sp.get("limit")) || 15 }));
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
