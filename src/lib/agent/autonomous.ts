/**
 * 2.6.1 自主任務規劃——讓 AI 員工「自己決定現在該做什麼」，而非跑固定指令。
 * 依（職責/使命 + 最近做過的事 + 分身對使用者的記憶）讓 LLM 挑「此刻最有價值的一件具體任務」。
 * 給排程自主員工用：autonomous 排程每次觸發先 planAutonomousGoal 決定 goal、再 launchAgentTask。
 */
import { completeForUsage } from "@/lib/resolve-usage-ai";

const SYSTEM = `你是一位 AI 員工的「規劃腦」。根據你的職責、最近做過的事、以及你對老闆(使用者)的了解，
決定「現在最值得做的一件具體任務」。規則：
- 只回**一句**可直接執行的任務指令（繁體中文、具體、有明確產出），不要解釋、不要清單、不要引號。
- 扣著你的職責、對老闆真的有用；**別重複最近剛做過的**；優先做有時效或能推進的事。
- 若真的沒有更好的事，就回一個穩健的例行任務（如整理近期重點 / 追蹤既有事項的進度）。`;

export async function planAutonomousGoal(args: {
  admin: any;
  userId: string;
  skillId?: string | null;
  mission: string;         // 這位員工的職責/使命（autonomous 排程的 goal 欄）
  freeModel?: string;
}): Promise<string> {
  const { admin, userId, skillId, mission } = args;

  // 職責：技能的角色框架（若有綁技能）
  let role = mission;
  if (skillId) {
    try {
      const { data: sk } = await admin.from("agent_skills").select("name, description, goal_template").eq("id", skillId).maybeSingle();
      if (sk) role = `${sk.name}：${sk.description ?? ""}\n守則：${sk.goal_template ?? ""}\n使命：${mission}`.slice(0, 800);
    } catch { /* 用 mission */ }
  }

  // 最近做過的事（避免重複）
  let recent = "";
  try {
    const { data } = await admin.from("agent_tasks")
      .select("goal, turn_summary, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(8);
    recent = ((data ?? []) as any[]).map((t) => `- ${t.goal}${t.turn_summary ? `（結果：${String(t.turn_summary).slice(0, 80)}）` : ""}`).join("\n");
  } catch { /* 略 */ }

  // 分身對使用者的長期記憶
  let mem = "";
  try {
    const { data } = await admin.from("agent_memory")
      .select("kind, key, value").eq("user_id", userId).limit(12);
    mem = ((data ?? []) as any[]).map((m) => `- ${m.key}：${String(m.value).slice(0, 80)}`).join("\n");
  } catch { /* 略 */ }

  const user = [
    `你的職責：\n${role}`,
    recent ? `你最近做過（別重複）：\n${recent}` : "你還沒做過任務。",
    mem ? `你知道關於老闆：\n${mem}` : "",
    "\n請決定「此刻最值得做的一件具體任務」，只回那句任務指令。",
  ].filter(Boolean).join("\n\n");

  try {
    const res = await completeForUsage("agent_core", { system: SYSTEM, user, maxTokens: 200, defaultModel: args.freeModel });
    const goal = (res.text ?? "").trim().replace(/^["「『]|["」』]$/g, "").split("\n")[0].slice(0, 300);
    return goal || mission;   // 生不出來 → 退回使命本身當任務
  } catch {
    return mission;
  }
}
