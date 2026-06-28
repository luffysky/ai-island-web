import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listActiveStories, createStory } from "@/lib/creator-engine/stories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { stories } 有效限動（前端分組） */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  return NextResponse.json({ stories: await listActiveStories() });
}

/** POST { mediaUrl, mediaType, caption } → { story } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  if (!b.mediaUrl || !["image", "video"].includes(b.mediaType)) return NextResponse.json({ error: "validation", message: "缺媒體" }, { status: 422 });
  return NextResponse.json({ story: await createStory(u.userId, b) });
}
