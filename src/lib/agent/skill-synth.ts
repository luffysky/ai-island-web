/**
 * 技能合成（L4）——把一個「已完成的任務」蒸餾成可重用的技能草稿。
 * 兩處共用：① `/api/agent/skills/synthesize`（使用者按「存成技能」即時合成）
 *          ② orchestrator 任務成功後**自動**預算一份建議（2.1.3），存 `agent_tasks.suggested_skill`，前端一鍵採用。
 * 不直接建立技能、只回草稿，由使用者確認/微調。
 */
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { TOOLS } from "@/lib/agent/tools";

const VALID_TOOLS = new Set(TOOLS.map((t) => t.name));

export type SkillDraft = {
  name: string;
  emoji: string;
  description: string;
  goal_template: string;
  allowed_tools: string[];
};

const SYNTH_SYSTEM = `你是技能設計師。把一次「已完成的任務」蒸餾成一個**可重複使用**的技能（給 AI 島分身島的 Agent 用）。
要點：
- goal_template 要**一般化**：別綁死這次的具體對象（例如把「找台北車站美食」抽象成「找某地點附近的美食並整理地址/價格/來源」），寫成一段清楚的工作守則。
- name 精簡（<=12 字）、emoji 一個、description 是「職務」一句話。
- 只回 JSON：{"name":"...","emoji":"...","description":"...","goal_template":"..."}。不要多餘文字、不要 markdown。`;

/**
 * 把 taskId 蒸餾成技能草稿。回 draft 或 null（找不到任務/非本人）。
 * admin = supabase admin client；userId 不給則不驗擁有者（orchestrator 內部呼叫已知安全）。
 */
export async function distillSkillFromTask(admin: any, taskId: string, userId?: string): Promise<SkillDraft | null> {
  const { data: task } = await admin.from("agent_tasks")
    .select("id, user_id, goal, plan, result, turn_summary").eq("id", taskId).maybeSingle();
  if (!task) return null;
  if (userId && task.user_id !== userId) return null;

  const { data: steps } = await admin.from("agent_steps")
    .select("tool_name, ok").eq("task_id", taskId).order("idx", { ascending: true });
  const usedTools: string[] = [];
  for (const s of steps ?? []) {
    const n = s.tool_name;
    if (n && n !== "reflect" && n !== "rule-filter" && VALID_TOOLS.has(n) && !usedTools.includes(n)) usedTools.push(n);
  }

  const goal = String(task.goal ?? "");
  const summary = String(task.turn_summary || (task.result as any)?.summary || "").slice(0, 1200);
  const plan = Array.isArray(task.plan) ? (task.plan as string[]) : [];

  const userMsg = `這次任務目標：${goal}
${plan.length > 1 ? `做法計畫：\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n` : ""}用到的工具：${usedTools.join(", ") || "（無）"}
最終結果摘要：${summary}

請蒸餾成可重用技能，只回 JSON。`;

  let draft: SkillDraft = { name: "", emoji: "🤖", description: "", goal_template: "", allowed_tools: usedTools };
  try {
    const res = await completeForUsage("agent_core", { system: SYNTH_SYSTEM, user: userMsg, maxTokens: 500, defaultModel: "claude-haiku-4-5-20251001" });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      const o = JSON.parse(t.slice(s, e + 1));
      draft = {
        name: String(o.name ?? "").slice(0, 20),
        emoji: String(o.emoji ?? "🤖").slice(0, 4),
        description: String(o.description ?? "").slice(0, 120),
        goal_template: String(o.goal_template ?? "").slice(0, 1000),
        allowed_tools: usedTools,
      };
    }
  } catch { /* 用 fallback */ }

  if (!draft.name) draft.name = (goal.slice(0, 16) || "新技能");
  if (!draft.goal_template) draft.goal_template = `你是專門處理這類任務的助手：${goal}。用可用工具查到具體資訊後，整理成清楚、附來源的答案。`;
  return draft;
}

/**
 * orchestrator 任務收尾後呼叫（fire-and-forget）：**自我把關**值不值得建議、值得才蒸餾一份存進
 * `agent_tasks.suggested_skill`，前端讀到就主動 nudge、一鍵採用。任何錯都吞掉（不能影響主流程）。
 * 把關條件：任務成功、非技能發起（別蒸餾自己）、≥2 步（招呼/1 步直答不值得）、還沒有建議過。
 */
export async function maybeSuggestSkill(admin: any, taskId: string): Promise<void> {
  try {
    const { data: t } = await admin.from("agent_tasks")
      .select("status, skill_id, step_count, suggested_skill").eq("id", taskId).maybeSingle();
    if (!t || t.status !== "succeeded" || t.skill_id || (t.step_count ?? 0) < 2 || t.suggested_skill) return;
    const draft = await distillSkillFromTask(admin, taskId);
    if (draft?.name) await admin.from("agent_tasks").update({ suggested_skill: draft }).eq("id", taskId);
  } catch { /* 靜默 */ }
}
