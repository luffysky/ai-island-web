import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listComments, addComment } from "@/lib/creator-engine/community";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?assetId → { comments } */
export async function GET(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const assetId = req.nextUrl.searchParams.get("assetId") ?? "";
  if (!assetId) return NextResponse.json({ error: "validation" }, { status: 422 });
  return NextResponse.json({ comments: await listComments(assetId) });
}

/** POST { assetId, assetType, body, parentId? } → { comment } */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  const body = String(b.body ?? "").trim();
  if (!b.assetId || !b.assetType || !body) return NextResponse.json({ error: "validation", message: "缺欄位" }, { status: 422 });
  return NextResponse.json({ comment: await addComment(String(b.assetId), String(b.assetType), u.userId, body, b.parentId) });
}
