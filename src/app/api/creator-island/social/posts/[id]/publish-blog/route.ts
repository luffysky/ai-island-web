import { NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { publishPostToBlog } from "@/lib/creator-engine/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 把自己的貼文發佈成本站部落格草稿。{ blogId } */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  try {
    const { blogId } = await publishPostToBlog(id, u.userId);
    return NextResponse.json({ ok: true, blogId });
  } catch (e) {
    const m = (e as Error).message;
    return NextResponse.json({ error: m, message: m === "forbidden" ? "只能發佈自己的貼文" : "發佈失敗" }, { status: m === "forbidden" ? 403 : 500 });
  }
}
