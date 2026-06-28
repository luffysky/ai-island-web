import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { isThreadMember, listMessages, sendMessage } from "@/lib/creator-engine/dm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { messages } */
export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { threadId } = await params;
  if (!(await isThreadMember(threadId, u.userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ messages: await listMessages(threadId) });
}

/** POST { body, mediaUrl, mediaType } → { message } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { threadId } = await params;
  if (!(await isThreadMember(threadId, u.userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({} as any));
  if (!b.body?.trim() && !b.mediaUrl) return NextResponse.json({ error: "validation" }, { status: 422 });
  return NextResponse.json({ message: await sendMessage(threadId, u.userId, b.body, b.mediaUrl, b.mediaType) });
}
