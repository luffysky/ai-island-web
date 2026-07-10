import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/kpi — 我的 Agent 成效指標（成功率/步數/人工介入/耗時/成本）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();

  const { data: tasks } = await admin.from("agent_tasks")
    .select("id, status, step_count, created_at, finished_at").eq("user_id", user.id);
  const rows = tasks ?? [];
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  const succeeded = by("succeeded"), failed = by("failed"), cancelled = by("cancelled");
  const running = rows.filter((r) => ["planning", "running", "awaiting_approval"].includes(r.status)).length;
  const finished = succeeded + failed;

  const durs = rows.filter((r) => r.finished_at && r.created_at)
    .map((r) => (new Date(r.finished_at!).getTime() - new Date(r.created_at).getTime()) / 1000).filter((d) => d >= 0);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  const { data: appr } = await admin.from("agent_approvals").select("task_id, decision").eq("user_id", user.id);
  const approvals = appr ?? [];
  const tasksWithApproval = new Set(approvals.map((a) => a.task_id)).size;

  return NextResponse.json({
    total: rows.length,
    succeeded, failed, cancelled, running,
    successRate: finished ? Math.round((succeeded / finished) * 100) : null,
    avgSteps: Math.round(avg(rows.map((r) => r.step_count ?? 0)) * 10) / 10,
    avgDurationSec: Math.round(avg(durs)),
    interventionRate: rows.length ? Math.round((tasksWithApproval / rows.length) * 100) : 0,
    approvals: {
      approved: approvals.filter((a) => a.decision === "approved").length,
      denied: approvals.filter((a) => a.decision === "denied").length,
    },
  });
}
