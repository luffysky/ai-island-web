import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { storyOwner, deleteStory, recordStoryView } from "@/lib/creator-engine/stories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 記一次觀看 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  await recordStoryView(id, u.userId);
  return NextResponse.json({ ok: true });
}

/** DELETE → 刪除自己的限動 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  if ((await storyOwner(id)) !== u.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await deleteStory(id);
  return NextResponse.json({ ok: true });
}
