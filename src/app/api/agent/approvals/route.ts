import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/approvals — 我所有「待批准」的動作（跨任務聚合，給辦公室待批准佇列用）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();

  const { data: pend } = await admin.from("agent_approvals")
    .select("id, task_id, step_idx, tool_name, risk, summary, created_at")
    .eq("user_id", user.id).eq("decision", "pending")
    .order("created_at", { ascending: true }).limit(50);

  const approvals = pend ?? [];
  // 補上各自任務的 goal（讓佇列看得懂是哪個任務要批准）
  const taskIds = [...new Set(approvals.map((a) => a.task_id).filter(Boolean))];
  let goalMap: Record<string, string> = {};
  if (taskIds.length) {
    const { data: tks } = await admin.from("agent_tasks")
      .select("id, goal").in("id", taskIds);
    goalMap = Object.fromEntries((tks ?? []).map((t) => [t.id, t.goal]));
  }

  return NextResponse.json({
    approvals: approvals.map((a) => ({ ...a, goal: goalMap[a.task_id] ?? "" })),
  });
}
