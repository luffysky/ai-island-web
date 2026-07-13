import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { launchAgentTask } from "@/lib/agent/launch";
import { computeNextRun, type Frequency } from "@/lib/agent/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * AI 員工排程自動跑 —— 撈「已啟用且到期」的排程，每條發起一個 agent 任務（背景跑）。
 *
 * 觸發：GET /api/cron/agent-schedules?secret=<CRON_SECRET>（建議每 15 分鐘一次）。
 * 到期判定：enabled 且 next_run_at <= now。跑完把 next_run_at 推到下一次、記 last_run_at/last_task_id/run_count。
 * 紅線：排程只「發起任務」；任務內若要對外（發文/報名）仍走既有 awaiting_approval 待你批准，排程不會自動對外。
 * 保護：單次最多處理 BATCH 條，避免一次噴太多背景任務打爆 node process。
 */
const BATCH = 15;

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin.from("agent_schedules")
    .select("id, user_id, skill_id, title, goal, frequency, hour, weekday, run_count")
    .eq("enabled", true).lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true }).limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; ok: boolean; taskId?: string; error?: string }[] = [];
  for (const s of due ?? []) {
    // 先把 next_run_at 往未來推（即使這次啟動失敗也不會下一分鐘又重跑）
    const nextRun = computeNextRun(s.frequency as Frequency, s.hour, s.weekday ?? null, Date.now());
    try {
      const r = await launchAgentTask({
        userId: s.user_id,
        goal: s.goal,
        skillId: s.skill_id,
        threadTitle: `🕒 排程：${s.title || s.goal}`.slice(0, 80),
      });
      if ("error" in r) {
        await admin.from("agent_schedules").update({ next_run_at: nextRun, updated_at: nowIso }).eq("id", s.id);
        results.push({ id: s.id, ok: false, error: r.error });
      } else {
        await admin.from("agent_schedules").update({
          next_run_at: nextRun, last_run_at: nowIso, last_task_id: r.taskId,
          run_count: (s.run_count ?? 0) + 1, updated_at: nowIso,
        }).eq("id", s.id);
        results.push({ id: s.id, ok: true, taskId: r.taskId });
      }
    } catch (e: any) {
      await admin.from("agent_schedules").update({ next_run_at: nextRun, updated_at: nowIso }).eq("id", s.id);
      results.push({ id: s.id, ok: false, error: String(e?.message ?? e) });
    }
  }

  return NextResponse.json({ ok: true, due: (due ?? []).length, launched: results.filter((r) => r.ok).length, results });
}
