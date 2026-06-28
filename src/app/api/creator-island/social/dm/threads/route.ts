import { NextRequest, NextResponse } from "next/server";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { listThreads, getOrCreateThread } from "@/lib/creator-engine/dm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → { threads } */
export async function GET() {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  return NextResponse.json({ threads: await listThreads(u.userId) });
}

/** POST { otherId } → { threadId } 開啟/建立對話 */
export async function POST(req: NextRequest) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const b = await req.json().catch(() => ({} as any));
  if (!b.otherId) return NextResponse.json({ error: "validation" }, { status: 422 });
  try { return NextResponse.json({ threadId: await getOrCreateThread(u.userId, String(b.otherId)) }); }
  catch (e) { return NextResponse.json({ error: "fail", message: (e as Error).message }, { status: 400 }); }
}
