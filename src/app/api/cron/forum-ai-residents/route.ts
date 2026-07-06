import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runForumAiResidents } from "@/lib/forum-ai-residents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 論壇 AI 住民自動回文。
 * 觸發：GET，帶 Authorization: Bearer <CRON_SECRET> 或 ?secret=<CRON_SECRET>
 * 建議排程：每 30~60 分。可帶 ?limit=N（預設 3）。
 */
export async function GET(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (guard) return guard;
  const limit = Math.max(1, Math.min(8, Number(req.nextUrl.searchParams.get("limit")) || 3));
  try {
    const result = await runForumAiResidents(limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
