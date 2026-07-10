import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Agent stale-task reaper — 把「卡住的進行中任務」標成 failed。
 *
 * 為什麼：背景任務（runAgentTaskDetached）靠長駐 node process；process 重啟會孤兒化
 * 進行中任務，讓它永遠卡在 running/planning。此 reaper 定期收屍。
 *
 * 觸發：GET /api/cron/agent-reaper?minutes=20（Authorization: Bearer $CRON_SECRET）
 * 判定：status in (planning,running) 且 created_at 早於 N 分鐘前 → failed。
 *       awaiting_approval 不收（那是在等使用者、waitForApproval 自有 5 分逾時會自然往下走）。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const minutes = Math.min(Math.max(Number(new URL(req.url).searchParams.get("minutes")) || 20, 5), 240);
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("agent_tasks")
    .update({ status: "failed", error: `逾時無回應（>${minutes} 分）可能背景中斷`, finished_at: new Date().toISOString() })
    .in("status", ["planning", "running"]).lt("created_at", cutoff)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reaped: (data ?? []).length, cutoffMinutes: minutes });
}
