import { NextRequest, NextResponse } from "next/server";
import { runAnomalyCheck } from "@/lib/anomaly-detect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 異常偵測 cron endpoint
 *
 * 觸發方式：外部 cron 每 15-30 分鐘打 GET /api/cron/anomaly-check
 * 需帶 Authorization: Bearer <CRON_SECRET>
 *
 * 範例（cron-job.org）：
 *   URL: https://your-domain.com/api/cron/anomaly-check
 *   Method: GET
 *   Header: Authorization: Bearer your-cron-secret
 *   Schedule: every 30 minutes
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_secret_not_set" }, { status: 500 });

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAnomalyCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
