import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runOpsAlertsAndNotify } from "@/lib/ops-alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 主動營運告警 cron endpoint
 *
 * 觸發方式：外部 cron 每 15-30 分鐘打 GET /api/cron/ops-alerts
 * 認證（跟其他 cron 一致、verifyCronAuth 三選一）：
 *   - Authorization: Bearer <CRON_SECRET>
 *   - x-cron-secret: <CRON_SECRET>
 *   - ?secret=<CRON_SECRET>                 ← cron-job.org 免費版可用
 *
 * 檢查：今日 AI 成本 / 單一使用者 AI 異常 / 金流失敗訂單 / error 暴增 / churn 風險。
 * 任一觸發 → notifyAdmin（站內 / LINE / Telegram / Discord）。
 * 門檻在 app_settings.ops_alert_thresholds 調整。
 */
export async function GET(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (guard) return guard;

  try {
    const result = await runOpsAlertsAndNotify();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
