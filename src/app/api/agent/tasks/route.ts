import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { launchAgentTask } from "@/lib/agent/launch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/agent/tasks — 我的任務清單（最近 30 筆）；?threadId=xxx 則回該對話串的回合（時間正序）
export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const threadId = new URL(req.url).searchParams.get("threadId");
  let q = admin.from("agent_tasks")
    .select("id, goal, status, step_count, result, error, created_at, finished_at, thread_id, turn_summary")
    .eq("user_id", user.id);
  q = threadId
    ? q.eq("thread_id", threadId).order("created_at", { ascending: true })
    : q.order("created_at", { ascending: false }).limit(30);
  const { data } = await q;
  return NextResponse.json({ tasks: data ?? [] });
}

// POST /api/agent/tasks { goal } — 建任務、在伺服器背景開跑（Phase 2b），立刻回 taskId。
// 前端靠輪詢 GET /api/agent/tasks/[id] 觀看；關掉頁面任務照跑、完成/需確認時推播。
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const goal = String(body.goal ?? "").trim().slice(0, 500);
  if (!goal) return NextResponse.json({ error: "缺 goal" }, { status: 400 });

  // 建任務 + 背景開跑（與排程共用 launchAgentTask；步數上限預設 40/安全上限 100）
  const cm = body.costMode;
  const r = await launchAgentTask({
    userId: user.id,
    goal,
    skillId: body.skillId ?? null,
    threadId: body.threadId ?? null,
    maxSteps: Number(body.maxSteps) || undefined,
    costMode: cm === "saver" || cm === "quality" || cm === "balanced" ? cm : undefined,
  });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ taskId: r.taskId, threadId: r.threadId, goal });
}
