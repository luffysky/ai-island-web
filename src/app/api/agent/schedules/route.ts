import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { computeNextRun, describeSchedule, type Frequency } from "@/lib/agent/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PER_USER = 20;

// GET /api/agent/schedules — 我的排程清單
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_schedules")
    .select("id, skill_id, title, goal, frequency, hour, weekday, enabled, autonomous, last_run_at, last_task_id, next_run_at, run_count, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ schedules: data ?? [] });
}

// POST /api/agent/schedules — 新增排程
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const goal = String(body.goal ?? "").trim().slice(0, 500);
  const autonomous = !!body.autonomous;   // 2.6.1：true 時 goal 當「職責/使命」、每次自己決定任務
  if (!goal) return NextResponse.json({ error: autonomous ? "缺職責描述（員工要以什麼身份決定做什麼）" : "缺 goal（要自動執行的指令）" }, { status: 400 });
  const frequency: Frequency = body.frequency === "weekly" ? "weekly" : "daily";
  const hour = Math.min(Math.max(Number(body.hour) || 9, 0), 23);
  const weekday = frequency === "weekly" ? Math.min(Math.max(Number(body.weekday) || 0, 0), 6) : null;

  const admin = createSupabaseAdmin();

  // 上限：每人最多 20 條
  const { count } = await admin.from("agent_schedules")
    .select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_PER_USER) return NextResponse.json({ error: `排程數已達上限（${MAX_PER_USER} 條）` }, { status: 400 });

  // 綁的員工（可空）——驗證是內建或本人的技能
  let skillId: string | null = null;
  if (body.skillId) {
    const { data: sk } = await admin.from("agent_skills")
      .select("id").eq("id", body.skillId).or(`is_builtin.eq.true,user_id.eq.${user.id}`).maybeSingle();
    if (sk) skillId = sk.id;
  }

  const title = String(body.title ?? "").trim().slice(0, 80) || describeSchedule(frequency, hour, weekday);
  const nextRun = computeNextRun(frequency, hour, weekday, Date.now());

  const { data, error } = await admin.from("agent_schedules")
    .insert({ user_id: user.id, skill_id: skillId, title, goal, frequency, hour, weekday, autonomous, next_run_at: nextRun })
    .select("id, skill_id, title, goal, frequency, hour, weekday, enabled, autonomous, next_run_at, run_count, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}
