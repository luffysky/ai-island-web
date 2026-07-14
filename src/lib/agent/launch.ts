import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { runAgentTaskDetached, type CostMode } from "@/lib/agent/orchestrator";

/**
 * 建任務 + 在伺服器背景開跑 —— 手動下令（/api/agent/tasks POST）與排程自動跑
 * （/api/cron/agent-schedules）共用這一條，避免兩邊邏輯漂移。
 *
 * 做的事：解析技能（限工具集/任務框架/步數）→ 沿用或開對話串 → 帶長期記憶 + 本串前文
 * → 寫 agent_tasks → runAgentTaskDetached 背景跑。回傳 { taskId, threadId }。
 */
export async function launchAgentTask(opts: {
  userId: string;
  goal: string;
  skillId?: string | null;
  threadId?: string | null;
  maxSteps?: number;
  threadTitle?: string;            // 開新串時的標題（排程可帶「🕒 排程：…」）
  skipDailyCap?: boolean;          // 排程/系統發起 → 不計入每日上限（automation 不該被擋）
  costMode?: CostMode;             // 省錢/平衡/品質三檔（決定用便宜或強模型）
}): Promise<{ taskId: string; threadId: string | null } | { error: string }> {
  const { userId } = opts;
  const goal = String(opts.goal ?? "").trim().slice(0, 500);
  if (!goal) return { error: "缺 goal" };
  const admin = createSupabaseAdmin();

  // 每日任務上限（防失控燒 token）：一般使用者每天 N 個互動任務；admin/owner 不限、排程不計。
  // fail-open：查詢出錯一律放行，絕不因這個 guard 的 bug 擋住正常使用。env `AGENT_DAILY_TASK_CAP` 可調。
  if (!opts.skipDailyCap) {
    try {
      const cap = Number(process.env.AGENT_DAILY_TASK_CAP) || 80;
      const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
      const role = (prof as any)?.role;
      if (role !== "admin" && role !== "owner") {
        const since = new Date(); since.setHours(0, 0, 0, 0);
        const { count } = await admin.from("agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId).gte("created_at", since.toISOString());
        if (typeof count === "number" && count >= cap) {
          return { error: `今天的分身任務已達上限（${cap} 個）。先看看已完成的結果，明天再繼續 🙌` };
        }
      }
    } catch { /* fail-open：不擋 */ }
  }

  // 選用技能：限制工具集 + 附加任務框架 + 決定 max_steps
  let skill: { allowedTools?: string[]; prompt?: string } | undefined;
  let skillId: string | null = null;
  let maxSteps = Math.min(Math.max(Number(opts.maxSteps) || 40, 1), 100);
  if (opts.skillId) {
    const { data: sk } = await admin.from("agent_skills")
      .select("id, goal_template, allowed_tools, max_steps, is_builtin, user_id")
      .eq("id", opts.skillId).or(`is_builtin.eq.true,user_id.eq.${userId}`).single();
    if (sk) {
      skillId = sk.id;
      skill = { allowedTools: (sk.allowed_tools as string[]) ?? [], prompt: sk.goal_template || undefined };
      maxSteps = Math.min(Math.max(Number(sk.max_steps) || maxSteps, 1), 100);
    }
  }

  // 對話延續：沿用既有 thread（帶前文）或開新 thread
  let threadId: string | null = null;
  if (opts.threadId) {
    const { data: th } = await admin.from("agent_threads")
      .select("id").eq("id", String(opts.threadId)).eq("user_id", userId).maybeSingle();
    if (th) threadId = th.id;
  }
  if (!threadId) {
    const { data: th } = await admin.from("agent_threads")
      .insert({ user_id: userId, title: (opts.threadTitle || goal).slice(0, 80), skill_id: skillId })
      .select("id").single();
    threadId = th?.id ?? null;
  }

  // 長期記憶（跨對話）
  let memoryBlock = "";
  {
    const { data: mem } = await admin.from("agent_memory")
      .select("key, value").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(30);
    if (mem && mem.length) {
      memoryBlock = "關於你（我長期記得的）：\n" + mem.map((m: any) => `- ${m.key}：${m.value}`).join("\n");
    }
  }

  // 本串先前回合（goal → 結果摘要）
  let turnsBlock = "";
  if (threadId) {
    const { data: prev } = await admin.from("agent_tasks")
      .select("goal, turn_summary, result, created_at")
      .eq("thread_id", threadId).eq("user_id", userId)
      .order("created_at", { ascending: true }).limit(8);
    const lines = (prev ?? [])
      .map((t: any) => {
        const ans = t.turn_summary || t.result?.summary || "";
        return ans ? `你：${t.goal}\n分身：${String(ans).slice(0, 400)}` : `你：${t.goal}`;
      })
      .join("\n\n");
    if (lines) turnsBlock = `本串先前對話（延續脈絡；若這次省略主詞/條件，沿用這裡講過的）：\n${lines}`;
  }

  // pgvector RAG：把目標轉向量，撈「語意相似的過去成功任務」當參考（跨對話記得你做過什麼）。
  // 順便把向量存到這次任務，之後的任務才撈得到它。OpenAI key 沒設/失敗 → 靜默略過、不影響主流程。
  let ragBlock = "";
  let goalVec: string | null = null;
  try {
    const { generateEmbedding, toPgVector } = await import("@/lib/embeddings");
    const emb = await generateEmbedding(goal);
    goalVec = toPgVector(emb.embedding);
    const { data: sim } = await admin.rpc("match_agent_tasks", { p_user_id: userId, p_embedding: goalVec, p_exclude_thread: threadId, p_limit: 3 });
    const useful = ((sim as any[]) ?? []).filter((s) => (s.similarity ?? 0) >= 0.72 && s.turn_summary);
    if (useful.length) {
      ragBlock = "你以前做過的相關任務（可參考做法/結論、別重問已知的）：\n" +
        useful.map((s) => `你：${s.goal}\n分身：${String(s.turn_summary).slice(0, 300)}`).join("\n\n");
    }
  } catch { /* 無 embedding key / 失敗 → 略過 RAG */ }

  const priorContext = [memoryBlock, turnsBlock, ragBlock].filter(Boolean).join("\n\n");

  const { data: task, error } = await admin.from("agent_tasks")
    .insert({ user_id: userId, goal, max_steps: maxSteps, status: "planning", skill_id: skillId, thread_id: threadId, embedding: goalVec })
    .select("id").single();
  if (error || !task) return { error: error?.message ?? "建任務失敗" };

  const costMode: CostMode = opts.costMode === "saver" || opts.costMode === "quality" ? opts.costMode : "balanced";
  runAgentTaskDetached(task.id, userId, goal, maxSteps, skill, undefined, priorContext, costMode);
  return { taskId: task.id, threadId };
}
