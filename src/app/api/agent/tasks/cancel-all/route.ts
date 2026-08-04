import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/agent/tasks/cancel-all —— 緊急停止（§2.9.4）：取消我所有進行中的分身任務，
// 並把派給我裝置、還沒做完的本機命令整批取消（桌面助手下次輪詢就不會再領到）。
const LIVE = ["planning", "running", "awaiting_approval", "awaiting_device"];

export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  // 1) 取消所有進行中的任務
  const { data: tasks } = await admin.from("agent_tasks")
    .update({ status: "cancelled", finished_at: now })
    .eq("user_id", user.id).in("status", LIVE).select("id");

  // 2) 取消派給「我的裝置」還沒做完的本機命令（pending/running → cancelled）
  let cancelledCalls = 0;
  const { data: devices } = await admin.from("agent_device_bridges").select("id").eq("user_id", user.id);
  const deviceIds = (devices ?? []).map((d: any) => d.id);
  if (deviceIds.length) {
    const { data: calls } = await admin.from("agent_device_calls")
      .update({ status: "cancelled", finished_at: now })
      .in("device_id", deviceIds).in("status", ["pending", "running"]).select("id");
    cancelledCalls = (calls ?? []).length;
  }

  return NextResponse.json({ ok: true, cancelledTasks: (tasks ?? []).length, cancelledCalls });
}
