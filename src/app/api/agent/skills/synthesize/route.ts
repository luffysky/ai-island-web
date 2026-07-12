import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { TOOLS } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TOOLS = new Set(TOOLS.map((t) => t.name));

// L4 技能合成：把一個「已完成的任務」蒸餾成可重用的技能草稿（不直接建立、回草稿讓使用者確認/微調）。
// 用實際用過的工具當 allowed_tools；用 AI 把這次做法一般化成 goal_template。
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const taskId = String(b.taskId ?? "");
  if (!taskId) return NextResponse.json({ error: "缺 taskId" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: task } = await admin.from("agent_tasks")
    .select("id, user_id, goal, plan, result, turn_summary").eq("id", taskId).maybeSingle();
  if (!task || task.user_id !== user.id) return NextResponse.json({ error: "找不到任務" }, { status: 404 });

  const { data: steps } = await admin.from("agent_steps")
    .select("tool_name, ok").eq("task_id", taskId).order("idx", { ascending: true });
  // 實際用過、且有效、且成功的工具 → 當作技能的 allowed_tools（去重、保留順序）
  const usedTools: string[] = [];
  for (const s of steps ?? []) {
    const n = s.tool_name;
    if (n && n !== "reflect" && VALID_TOOLS.has(n) && !usedTools.includes(n)) usedTools.push(n);
  }

  const goal = String(task.goal ?? "");
  const summary = String(task.turn_summary || (task.result as any)?.summary || "").slice(0, 1200);
  const plan = Array.isArray(task.plan) ? (task.plan as string[]) : [];

  const system = `你是技能設計師。把一次「已完成的任務」蒸餾成一個**可重複使用**的技能（給 AI 島分身島的 Agent 用）。
要點：
- goal_template 要**一般化**：別綁死這次的具體對象（例如把「找台北車站美食」抽象成「找某地點附近的美食並整理地址/價格/來源」），寫成一段清楚的工作守則。
- name 精簡（<=12 字）、emoji 一個、description 是「職務」一句話。
- 只回 JSON：{"name":"...","emoji":"...","description":"...","goal_template":"..."}。不要多餘文字、不要 markdown。`;
  const userMsg = `這次任務目標：${goal}
${plan.length > 1 ? `做法計畫：\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n` : ""}用到的工具：${usedTools.join(", ") || "（無）"}
最終結果摘要：${summary}

請蒸餾成可重用技能，只回 JSON。`;

  let draft = { name: "", emoji: "🤖", description: "", goal_template: "" };
  try {
    const res = await completeForUsage("agent_core", { system, user: userMsg, maxTokens: 500, defaultModel: "claude-haiku-4-5-20251001" });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      const o = JSON.parse(t.slice(s, e + 1));
      draft = {
        name: String(o.name ?? "").slice(0, 20),
        emoji: String(o.emoji ?? "🤖").slice(0, 4),
        description: String(o.description ?? "").slice(0, 120),
        goal_template: String(o.goal_template ?? "").slice(0, 1000),
      };
    }
  } catch { /* 用 fallback */ }

  // AI 失敗時的保底：用任務本身湊一個可編輯草稿
  if (!draft.name) draft.name = (goal.slice(0, 16) || "新技能");
  if (!draft.goal_template) draft.goal_template = `你是專門處理這類任務的助手：${goal}。用可用工具查到具體資訊後，整理成清楚、附來源的答案。`;

  return NextResponse.json({ draft: { ...draft, allowed_tools: usedTools } });
}
