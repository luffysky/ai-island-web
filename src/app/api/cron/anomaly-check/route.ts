import { NextRequest, NextResponse } from "next/server";
import { runAnomalyCheck } from "@/lib/anomaly-detect";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 異常偵測 cron endpoint
 *
 * 觸發方式：外部 cron 每 15-30 分鐘打 GET /api/cron/anomaly-check
 * 認證三選一：
 *   - Authorization: Bearer <CRON_SECRET>
 *   - x-cron-secret: <CRON_SECRET>
 *   - ?secret=<CRON_SECRET>                 ← cron-job.org 免費版可用
 *
 * 範例（cron-job.org 免費版）：
 *   URL: https://your-domain.com/api/cron/anomaly-check?secret=YOUR_CRON_SECRET
 *   Method: GET
 *   Schedule: every 30 minutes
 */
export async function GET(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (guard) return guard;

  try {
    const result = await runAnomalyCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
