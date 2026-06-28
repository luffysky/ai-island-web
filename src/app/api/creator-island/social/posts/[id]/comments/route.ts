import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listPostComments, addPostComment } from "@/lib/creator-engine/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  return NextResponse.json({ comments: await listPostComments(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as any));
  const body = String(b.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "validation" }, { status: 422 });
  return NextResponse.json({ comment: await addPostComment(id, u.userId, body, b.parentId) });
}
