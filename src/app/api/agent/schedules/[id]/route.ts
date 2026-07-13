import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { computeNextRun, describeSchedule, type Frequency } from "@/lib/agent/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PATCH /api/agent/schedules/[id] — 開關 / 編輯排程
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const admin = createSupabaseAdmin();

  // 取現值（確認擁有者 + 補算 next_run_at 時要用舊值）
  const { data: cur } = await admin.from("agent_schedules")
    .select("id, frequency, hour, weekday").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 80);
  if (typeof body.goal === "string" && body.goal.trim()) patch.goal = body.goal.trim().slice(0, 500);

  // 改了時間 → 重算 next_run_at
  const freq: Frequency = (body.frequency === "daily" || body.frequency === "weekly") ? body.frequency : (cur.frequency as Frequency);
  const hour = body.hour != null ? Math.min(Math.max(Number(body.hour), 0), 23) : cur.hour;
  const weekday = freq === "weekly"
    ? (body.weekday != null ? Math.min(Math.max(Number(body.weekday), 0), 6) : (cur.weekday ?? 0))
    : null;
  const timeChanged = body.frequency != null || body.hour != null || body.weekday != null;
  if (timeChanged) {
    patch.frequency = freq;
    patch.hour = hour;
    patch.weekday = weekday;
    patch.next_run_at = computeNextRun(freq, hour, weekday, Date.now());
    if (!body.title && !patch.title) patch.title = describeSchedule(freq, hour, weekday);
  }
  // 重新啟用 → 也把 next_run_at 往未來推，避免立刻補跑
  if (patch.enabled === true && !timeChanged) {
    patch.next_run_at = computeNextRun(freq, hour, weekday, Date.now());
  }

  const { data, error } = await admin.from("agent_schedules")
    .update(patch).eq("id", id).eq("user_id", user.id)
    .select("id, skill_id, title, goal, frequency, hour, weekday, enabled, last_run_at, last_task_id, next_run_at, run_count, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}

// DELETE /api/agent/schedules/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_schedules").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
