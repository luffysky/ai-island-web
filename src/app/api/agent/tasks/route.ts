import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { runAgentTaskDetached } from "@/lib/agent/orchestrator";

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
  const admin = createSupabaseAdmin();

  // 選用技能：限制工具集 + 附加任務框架 + 決定 max_steps
  let skill: { allowedTools?: string[]; prompt?: string } | undefined;
  let skillId: string | null = null;
  // 步數上限拉高（預設 40、安全上限 100 防跑飛）；達上限時會用目前進度合成最終答案、不再直接失敗。
  let maxSteps = Math.min(Math.max(Number(body.maxSteps) || 40, 1), 100);
  if (body.skillId) {
    const { data: sk } = await admin.from("agent_skills")
      .select("id, goal_template, allowed_tools, max_steps, is_builtin, user_id")
      .eq("id", body.skillId).or(`is_builtin.eq.true,user_id.eq.${user.id}`).single();
    if (sk) {
      skillId = sk.id;
      skill = { allowedTools: (sk.allowed_tools as string[]) ?? [], prompt: sk.goal_template || undefined };
      maxSteps = Math.min(Math.max(Number(sk.max_steps) || maxSteps, 1), 100);
    }
  }

  // Phase A：對話延續 — 沿用既有 thread（帶前文）或開新 thread
  let threadId: string | null = null;
  if (body.threadId) {
    const { data: th } = await admin.from("agent_threads")
      .select("id").eq("id", String(body.threadId)).eq("user_id", user.id).maybeSingle();
    if (th) threadId = th.id;
  }
  if (!threadId) {
    const { data: th } = await admin.from("agent_threads")
      .insert({ user_id: user.id, title: goal.slice(0, 80), skill_id: skillId })
      .select("id").single();
    threadId = th?.id ?? null;
  }

  // Phase C：長期記憶（跨對話）— 這位使用者、分身長期記得的事實/偏好/技能/專案/目標
  let memoryBlock = "";
  {
    const { data: mem } = await admin.from("agent_memory")
      .select("key, value").eq("user_id", user.id)
      .order("updated_at", { ascending: false }).limit(30);
    if (mem && mem.length) {
      memoryBlock = "關於你（我長期記得的）：\n" + mem.map((m: any) => `- ${m.key}：${m.value}`).join("\n");
    }
  }

  // Phase A：本串先前回合（goal → 結果摘要），讓這次目標可省略主詞/沿用上輪設定
  let turnsBlock = "";
  if (threadId) {
    const { data: prev } = await admin.from("agent_tasks")
      .select("goal, turn_summary, result, created_at")
      .eq("thread_id", threadId).eq("user_id", user.id)
      .order("created_at", { ascending: true }).limit(8);
    const lines = (prev ?? [])
      .map((t: any) => {
        const ans = t.turn_summary || t.result?.summary || "";
        return ans ? `你：${t.goal}\n分身：${String(ans).slice(0, 400)}` : `你：${t.goal}`;
      })
      .join("\n\n");
    if (lines) turnsBlock = `本串先前對話（延續脈絡；若這次省略主詞/條件，沿用這裡講過的）：\n${lines}`;
  }

  const priorContext = [memoryBlock, turnsBlock].filter(Boolean).join("\n\n");

  const { data: task, error } = await admin.from("agent_tasks")
    .insert({ user_id: user.id, goal, max_steps: maxSteps, status: "planning", skill_id: skillId, thread_id: threadId })
    .select("id").single();
  if (error || !task) return NextResponse.json({ error: error?.message ?? "建任務失敗" }, { status: 500 });

  runAgentTaskDetached(task.id, user.id, goal, maxSteps, skill, undefined, priorContext);  // 背景跑、帶前文
  return NextResponse.json({ taskId: task.id, threadId, goal });
}
