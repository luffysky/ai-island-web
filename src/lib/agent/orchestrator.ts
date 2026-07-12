// Agent Core — 任務規劃/工具決策 loop。對齊 docs/agent_platform_plan.md §2/§4/§9。
// 流程：讀目標 → LLM 規劃下一步(工具+參數) → 權限判斷(read 自動 / write,dangerous 要確認) →
//        執行工具 → 記錄 step → 回饋觀察給 LLM → 直到 LLM 說 done 或達 max_steps。
// 以 async generator 吐事件，讓 API route 轉成 SSE。approval 用「寫 DB pending row + 輪詢」等前端決定。
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { getTool, describeToolList, effectiveTools, needsApproval, approvalSummary, toolAllowed, type ToolResult, type AgentTool } from "./tools";
import { getOnlineDevice, dispatchToDevice } from "./bridge";
import { sendPushToUser } from "@/lib/web-push";
import { loadUserMcpTools } from "./mcp";

// 手機遙控核心：關鍵時刻推播到使用者所有裝置（VAPID 未設會自動 no-op）。fire-and-forget。
function pushSafe(userId: string, title: string, body: string, taskId: string, tag: string) {
  sendPushToUser(userId, { title, body: body.slice(0, 90), url: `/agent?task=${taskId}`, tag }).catch(() => {});
}

export type AgentEvent =
  | { type: "status"; status: string }
  | { type: "thought"; idx: number; thought: string }
  | { type: "step"; step: StepRow }
  | { type: "approval"; approval: { id: string; toolName: string; risk: string; summary: Record<string, string> } }
  | { type: "done"; status: "succeeded" | "failed" | "cancelled"; summary: string }
  | { type: "error"; error: string };

interface StepRow {
  idx: number; thought?: string; toolName?: string; risk?: string;
  args?: unknown; result?: unknown; ok?: boolean;
}

interface Decision { thought?: string; tool?: string; args?: any; done?: boolean; summary?: string; }

// 技能：限制可用工具 + 附加任務框架/守則（Phase 3）
export interface SkillCtx { allowedTools?: string[]; prompt?: string; }

function parseDecision(text: string): Decision | null {
  let t = (text ?? "").trim();
  // 去 code fence
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}

const PLANNER_SYSTEM = `你是 AI 島的行動代理（Agent）核心。你會被交付一個目標，要一步一步用「工具」把它完成。

規則：
- 每一步只回**一個** JSON 物件、不要多餘文字、不要 markdown。
- 想用工具：{"thought":"你這步要做什麼、為什麼","tool":"工具名","args":{...}}
- 覺得目標已完成、或無法再進行：{"thought":"...","done":true,"summary":"給使用者的最終中文回覆（含你查到的重點）"}
- 只能用下面清單裡的工具。args 要符合該工具的參數。
- 唯讀(read)工具會自動執行；write/dangerous 工具會先請使用者確認，被拒就換做法或收尾。
- 若某工具回「需桌面助手（Phase 1b 尚未接）」，代表本機能力還沒接上，請據此收尾說明、不要硬試同一個。
- **效率優先（重要）**：
  - **絕不重複**已做過的搜尋或抓取（同關鍵字/同網址）；看到 result 標「repeated/沿用上次」就換做法或直接 done。
  - 查資料 **2–3 個來源就夠**，不要為了湊每一家的電話/地址/營業時間無止盡查——用已讀到的內容整理即可。
  - 搜尋連續回空（被擋）就**別再搜**，用手上資料收尾。
  - 拿到足夠資訊就 done；能 5 步做完別用 15 步。done 的 summary 要用清楚的 Markdown（標題/清單/粗體）整理好。`;

// L1 拆解引擎：把目標拆成 1-6 個有明確產出的子任務（簡單目標→單一項）。免費模型即可。
async function decompose(goal: string, priorContext = "", freeModel = PLANNER_STRONG): Promise<string[]> {
  try {
    const system = "你是任務規劃師。把使用者目標拆成 1-6 個可獨立完成、有明確產出的子任務（越少越好；簡單目標就回單一項、別硬拆）。只回 JSON 字串陣列、繁體中文、每項一句。";
    const user = `${priorContext ? priorContext + "\n\n" : ""}目標：${goal}\n\n只回 JSON 陣列。`;
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 400, defaultModel: freeModel });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("["), e = t.lastIndexOf("]");
    if (s === -1 || e === -1) return [goal];
    const arr = JSON.parse(t.slice(s, e + 1));
    const items = Array.isArray(arr) ? arr.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, 6) : [];
    return items.length ? items : [goal];
  } catch { return [goal]; }
}

async function planNext(goal: string, history: StepRow[], skill?: SkillCtx, extraTools: AgentTool[] = [], priorContext = "", plan: string[] = [], freeModel = PLANNER_STRONG): Promise<Decision | null> {
  const hist = history.map((s) =>
    `#${s.idx} ${s.toolName ?? "?"}(${JSON.stringify(s.args ?? {})}) → ${s.ok ? "ok" : "fail"}: ${JSON.stringify(s.result ?? {}).slice(0, 400)}`
  ).join("\n") || "（尚無步驟）";
  const system = skill?.prompt ? `${PLANNER_SYSTEM}\n\n【本次技能設定】${skill.prompt}` : PLANNER_SYSTEM;
  const toolsDesc = describeToolList(effectiveTools(skill?.allowedTools, extraTools));
  const toolsBlock = toolsDesc || "（本技能不使用任何工具。請直接依『目標』與技能設定，用一則 {\"done\":true,\"summary\":\"...\"} 回覆完整答案。）";
  // Phase A/C：延續脈絡（長期記憶 + 本串先前回合）由 API 端組好、這裡原樣注入
  const priorBlock = priorContext ? `${priorContext}\n\n` : "";
  // L1：任務計畫（子任務 checklist）。逐項完成、全部完成才 done。
  const planBlock = plan.length > 1
    ? `【任務計畫】請依序完成下列每一項，全部做完才回 done（還有沒完成的項就繼續、別提早 done）：\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n`
    : "";
  const user = `${priorBlock}${planBlock}這次目標：${goal}

可用工具：
${toolsBlock}

目前進度：
${hist}

請只回下一步的 JSON。`;
  // 免費模型先跑（成本≈0）；沒回出有效 JSON → 自動升級到較強模型再試一次（自己判斷何時需要高級）
  let res = await completeForUsage("agent_core", { system, user, maxTokens: 900, defaultModel: freeModel });
  let d = parseDecision(res.text);
  if (!d && freeModel !== PLANNER_STRONG) {
    res = await completeForUsage("agent_core", { system, user, maxTokens: 900, defaultModel: PLANNER_STRONG });
    d = parseDecision(res.text);
  }
  return d;
}

// 需要升級時用的可靠強模型（Haiku 確定活著）。免費優先由 pickFreeModel 動態挑「還活著的最便宜模型」。
const PLANNER_STRONG = "claude-haiku-4-5-20251001";

// 免費優先：從 active 模型挑最便宜的 low/mid（被下架的已被 model-health 自動停用 → 挑到的都活著）。
// 挑不到就退回 Haiku。每個任務解析一次即可。
async function pickFreeModel(): Promise<string> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("ai_models")
      .select("model_name, cost_output_per_1m")
      .eq("is_active", true).in("tier", ["low", "mid"])
      .order("cost_output_per_1m", { ascending: true }).limit(1);
    return data?.[0]?.model_name || PLANNER_STRONG;
  } catch { return PLANNER_STRONG; }
}

// L3 反思：done 前的驗收員——判斷目標/計畫是否真達標。寬鬆（核心達成就 ok），免費模型即可。
async function critique(goal: string, plan: string[], history: StepRow[], summary: string, freeModel = PLANNER_STRONG): Promise<{ ok: boolean; missing?: string } | null> {
  try {
    const hist = history.map((s) => `#${s.idx} ${s.toolName ?? "?"} → ${s.ok ? "ok" : "fail"}`).join("\n") || "（無）";
    const system = "你是嚴格但務實的驗收員。判斷『目標與計畫是否真的完成、最終答案是否達標』。寬鬆一點：只要核心目標達成就算 ok、別吹毛求疵。只回 JSON：{\"ok\":true} 或 {\"ok\":false,\"missing\":\"還缺什麼、下一步該做什麼（一句、繁中）\"}。";
    const user = `目標：${goal}\n計畫：\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n進度：\n${hist}\n\n最終答案：${summary}\n\n只回 JSON。`;
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 200, defaultModel: freeModel });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s === -1 || e === -1) return null;
    const o = JSON.parse(t.slice(s, e + 1));
    return { ok: o.ok !== false, missing: o.missing ? String(o.missing).slice(0, 200) : undefined };
  } catch { return null; }
}

// 達到步數上限時：不要直接失敗，用目前進度合成「最好的最終答案」給使用者（例如已查到的美食清單）。
async function finalizeFromHistory(goal: string, history: StepRow[]): Promise<string> {
  try {
    const hist = history.map((s) =>
      `#${s.idx} ${s.toolName ?? "?"} → ${s.ok ? "ok" : "fail"}: ${JSON.stringify(s.result ?? {}).slice(0, 500)}`
    ).join("\n") || "（沒有可用進度）";
    const res = await completeForUsage("agent_core", {
      system: "你是 AI 島的行動代理。根據以下已完成步驟與觀察，直接給使用者最好、最完整的『最終中文答案』。不要再要求用工具、不要回 JSON，就是自然語言結論（可條列）。",
      user: `目標：${goal}\n\n目前進度：\n${hist}\n\n請直接給最終答案：`,
      maxTokens: 900, defaultModel: PLANNER_STRONG,
    });
    return (res.text ?? "").trim();
  } catch { return ""; }
}

// Phase B：本機步驟遇到「電腦沒開」→ 輪詢等桌面助手上線（雲端步驟不受影響、早已能跑）。
// 回上線的 device，或 null（逾時/取消）。
async function waitForDevice(userId: string, taskId: string, timeoutMs = 300_000) {
  const admin = createSupabaseAdmin();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data: t } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
    if (t?.status === "cancelled") return null;
    const device = await getOnlineDevice(userId);
    if (device) return device;
  }
  return null;
}

// Phase C：從完成的回合抽取「關於使用者的持久事實」，upsert 進 agent_memory（跨對話記得你）。
// 便宜 haiku 一次；抽不到就跳過。fire-and-forget、不擋主流程。
async function extractMemory(userId: string, goal: string, summary: string, threadId?: string | null) {
  try {
    const system = `你是記憶抽取器。從一段「使用者目標 + 分身回覆」中，抽出關於**使用者本人**的持久事實（之後別的對話也用得到的），例如受眾、常用平台、語氣偏好、擁有的作品/專案、技能、長期目標。
只回 JSON 陣列，每項 {"kind":"fact|preference|skill|project|goal","key":"短鍵(如 受眾/常用平台/語氣)","value":"值"}。
規則：只抽「跨對話仍成立」的穩定事實；一次性任務內容不要抽。沒有就回 []。最多 4 條。`;
    const user = `使用者目標：${goal}\n分身回覆：${summary.slice(0, 800)}\n\n只回 JSON 陣列。`;
    const res = await completeForUsage("agent_core", { system, user, maxTokens: 300, defaultModel: "claude-haiku-4-5-20251001" });
    const t = (res.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = t.indexOf("["), e = t.lastIndexOf("]");
    if (s === -1 || e === -1) return;
    const items = JSON.parse(t.slice(s, e + 1));
    if (!Array.isArray(items) || items.length === 0) return;
    const admin = createSupabaseAdmin();
    const rows = items
      .filter((i: any) => i && i.key && i.value)
      .slice(0, 4)
      .map((i: any) => ({
        user_id: userId,
        kind: ["fact", "preference", "skill", "project", "goal"].includes(i.kind) ? i.kind : "fact",
        key: String(i.key).slice(0, 60),
        value: String(i.value).slice(0, 400),
        source_thread_id: threadId ?? null,
        updated_at: new Date().toISOString(),
      }));
    if (rows.length) await admin.from("agent_memory").upsert(rows, { onConflict: "user_id,kind,key" });
  } catch { /* 記憶抽取失敗不影響任務 */ }
}

// 等前端決定 approval（輪詢 DB）；回 true=approved / false=denied 或逾時/取消。
async function waitForApproval(approvalId: string, taskId: string, timeoutMs = 300_000): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await admin.from("agent_approvals").select("decision").eq("id", approvalId).single();
    if (data?.decision === "approved") return true;
    if (data?.decision === "denied") return false;
    const { data: t } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
    if (t?.status === "cancelled") return false;
  }
  return false;
}

// Phase 2b：背景執行——任務不綁 HTTP 連線，關掉頁面也照跑。
// Zeabur 是長駐 node server，detached promise 會續跑；步驟寫進 DB、關鍵時刻推播、前端靠輪詢觀看。
const RUNNING = new Set<string>();
export function runAgentTaskDetached(taskId: string, userId: string, goal: string, maxSteps = 40, skill?: SkillCtx, extraTools?: AgentTool[], priorContext = ""): void {
  if (RUNNING.has(taskId)) return;
  RUNNING.add(taskId);
  (async () => {
    // 動態工具：沒帶就自動載入使用者啟用的 MCP server 工具（背景進行、不擋 POST 回應）
    const dyn = extraTools ?? await loadUserMcpTools(userId).catch(() => []);
    // 事件在 runAgentTask 內就已落 DB + 推播；這裡只需把 generator 跑到底、不需消費事件。
    try { for await (const _ev of runAgentTask(taskId, userId, goal, maxSteps, skill, dyn, priorContext)) { void _ev; } }
    catch { /* runAgentTask 自身的 try/catch 已把任務標成 failed */ }
    finally { RUNNING.delete(taskId); }
  })();
}

/** 跑一個任務，吐事件流。extraTools = 動態工具（如 MCP）；priorContext = 本串先前對話（Phase A 對話延續）。 */
export async function* runAgentTask(taskId: string, userId: string, goal: string, maxSteps = 40, skill?: SkillCtx, extraTools: AgentTool[] = [], priorContext = ""): AsyncGenerator<AgentEvent> {
  const admin = createSupabaseAdmin();
  const history: StepRow[] = [];
  const doneCalls = new Map<string, ToolResult>();  // 去重：同一個 (工具+參數) 只真的做一次
  // 本回合結束時要更新對話串 last_message_at + 寫 turn_summary
  const bumpThread = async (summary: string) => {
    await admin.from("agent_tasks").update({ turn_summary: summary.slice(0, 600) }).eq("id", taskId);
    const { data: t } = await admin.from("agent_tasks").select("thread_id").eq("id", taskId).maybeSingle();
    if (t?.thread_id) await admin.from("agent_threads").update({ last_message_at: new Date().toISOString() }).eq("id", t.thread_id);
  };
  const setStatus = async (status: string, patch: Record<string, unknown> = {}) => {
    await admin.from("agent_tasks").update({ status, ...patch }).eq("id", taskId);
  };

  yield { type: "status", status: "planning" };
  await setStatus("running");

  // 免費優先：本任務用「最便宜的活模型」規劃，需要時才升級（planNext 沒回有效 JSON 就升級）
  const freeModel = await pickFreeModel();
  // L1 拆解引擎：先把目標拆成計畫（存 DB 給 UI 顯示），再逐項執行
  const plan = await decompose(goal, priorContext, freeModel);
  await admin.from("agent_tasks").update({ plan, plan_done: [] }).eq("id", taskId);
  let critiques = 0;  // L3：done 前反思次數上限（避免無限/燒錢）

  try {
    for (let idx = 0; idx < maxSteps; idx++) {
      // 取消？
      const { data: cur } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
      if (cur?.status === "cancelled") { yield { type: "done", status: "cancelled", summary: "任務已取消" }; return; }

      const decision = await planNext(goal, history, skill, extraTools, priorContext, plan, freeModel);
      if (!decision) {
        await setStatus("failed", { error: "規劃失敗（模型未回有效 JSON）", finished_at: new Date().toISOString() });
        yield { type: "error", error: "規劃失敗：模型未回有效指令" };
        yield { type: "done", status: "failed", summary: "抱歉，我沒能規劃出下一步。" };
        return;
      }
      if (decision.thought) yield { type: "thought", idx, thought: decision.thought };

      if (decision.done || !decision.tool) {
        const summary = decision.summary ?? "完成。";
        // L3 反思：多步計畫在 done 前驗收；沒達標就回饋、繼續做（最多 2 次，避免無限/燒錢）
        if (plan.length > 1 && critiques < 2) {
          const v = await critique(goal, plan, history, summary, freeModel);
          if (v && v.ok === false && v.missing) {
            critiques++;
            const row: StepRow = { idx, thought: `自我檢查：還沒達標 — ${v.missing}`, toolName: "reflect", ok: true, result: { missing: v.missing } };
            history.push(row);
            await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: "reflect", args: {}, result: row.result, ok: true });
            await admin.from("agent_tasks").update({ step_count: idx + 1 }).eq("id", taskId);
            yield { type: "step", step: row };
            continue;
          }
        }
        await setStatus("succeeded", { result: { summary }, step_count: idx, finished_at: new Date().toISOString() });
        await bumpThread(summary);   // Phase A：把本回合結果留給後續對話當前文
        extractMemory(userId, goal, summary).catch(() => {});   // Phase C：抽取持久事實、跨對話記得你（fire-and-forget）
        pushSafe(userId, "✅ Agent 完成任務", summary, taskId, `agent-done-${taskId}`);
        yield { type: "done", status: "succeeded", summary };
        return;
      }

      const tool = getTool(decision.tool) ?? extraTools.find((t) => t.name === decision.tool);
      const row: StepRow = { idx, thought: decision.thought, toolName: decision.tool, risk: tool?.risk, args: decision.args };
      if (tool && !toolAllowed(tool.name, skill?.allowedTools)) {
        row.ok = false; row.result = { error: `此技能不允許使用工具 ${tool.name}` };
        history.push(row);
        await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: tool.name, args: decision.args ?? {}, result: row.result, ok: false });
        yield { type: "step", step: row };
        continue;
      }
      if (!tool) {
        row.ok = false; row.result = { error: `未知工具 ${decision.tool}` };
        history.push(row);
        await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: decision.tool, args: decision.args ?? {}, result: row.result, ok: false });
        yield { type: "step", step: row };
        continue;
      }

      // 權限：write / dangerous → 建 approval、暫停等使用者
      if (needsApproval(tool.risk)) {
        const summary = approvalSummary(tool, decision.args);
        const { data: appr } = await admin.from("agent_approvals")
          .insert({ task_id: taskId, user_id: userId, step_idx: idx, tool_name: tool.name, risk: tool.risk, summary })
          .select("id").single();
        await setStatus("awaiting_approval");
        pushSafe(userId, "🤖 Agent 需要你確認", `${tool.name}：${goal}`, taskId, `agent-appr-${taskId}`);
        yield { type: "approval", approval: { id: appr!.id, toolName: tool.name, risk: tool.risk, summary } };
        const ok = await waitForApproval(appr!.id, taskId);
        await setStatus("running");
        if (!ok) {
          row.ok = false; row.result = { error: "使用者未同意此動作（或逾時/取消）" };
          history.push(row);
          await admin.from("agent_steps").insert({ task_id: taskId, idx, thought: row.thought, tool_name: tool.name, risk: tool.risk, args: decision.args ?? {}, result: row.result, ok: false });
          yield { type: "step", step: row };
          continue;
        }
      }

      // 執行：需本機的工具走桌面助手 Bridge（佇列+輪詢）；其餘伺服器端直接跑
      // 去重：同一個 (工具+參數) 已做過 → 直接沿用上次結果、不重打網路（省時間/token、避免被來源擋）
      const callKey = `${tool.name}:${JSON.stringify(decision.args ?? {})}`;
      let result: ToolResult;
      if (doneCalls.has(callKey)) {
        const cached = doneCalls.get(callKey)!;
        result = { ok: cached.ok, data: { repeated: true, note: "這個呼叫和先前重複、已沿用上次結果。請換關鍵字/換工具，或資訊夠了就 done。", previous: cached.data }, error: cached.error };
      } else try {
        if (tool.needsDevice) {
          let device = await getOnlineDevice(userId);
          if (!device) {
            // Phase B：電腦沒開 → 標記等待、推播、輪詢等它上線（雲端步驟早已完成、不受影響）
            await setStatus("awaiting_device");
            pushSafe(userId, "🖥️ 分身在等你的電腦上線", `這步需要桌面助手：${tool.name}`, taskId, `agent-dev-${taskId}`);
            yield { type: "status", status: "awaiting_device" };
            device = await waitForDevice(userId, taskId);
            await setStatus("running");
          }
          if (!device) {
            result = { ok: false, error: "這步需要你的電腦（桌面助手），但它一直沒上線。能在雲端做的部分我已先完成；等電腦上線後可重跑這步。" };
          } else {
            result = await dispatchToDevice(taskId, userId, device.id, idx, tool.name, decision.args ?? {});
          }
        } else {
          result = await tool.execute(decision.args ?? {}, { userId, taskId });
        }
      } catch (e: any) { result = { ok: false, error: e?.message ?? "工具執行例外" }; }
      if (!doneCalls.has(callKey)) doneCalls.set(callKey, result);  // 記起來、下次同呼叫直接沿用
      row.ok = result.ok; row.result = result.ok ? result.data : { error: result.error };
      history.push(row);
      await admin.from("agent_steps").insert({
        task_id: taskId, idx, thought: row.thought, tool_name: tool.name, risk: tool.risk,
        args: decision.args ?? {}, result: row.result, ok: result.ok, verified: result.ok,
      });
      await admin.from("agent_tasks").update({ step_count: idx + 1 }).eq("id", taskId);
      yield { type: "step", step: row };
    }

    // 達到步數上限 → 不要直接失敗，用目前進度合成「最好的最終答案」給使用者（例如已查到的美食清單）
    const finalAns = await finalizeFromHistory(goal, history);
    if (finalAns) {
      await setStatus("succeeded", { result: { summary: finalAns }, step_count: maxSteps, finished_at: new Date().toISOString() });
      await bumpThread(finalAns);
      extractMemory(userId, goal, finalAns).catch(() => {});
      pushSafe(userId, "✅ Agent 完成任務", finalAns, taskId, `agent-done-${taskId}`);
      yield { type: "done", status: "succeeded", summary: finalAns };
      return;
    }
    await setStatus("failed", { error: "步數用盡且無可用結果", finished_at: new Date().toISOString() });
    yield { type: "done", status: "failed", summary: "這個任務比較複雜、我還沒完成。可以把目標拆小一點再試。" };
  } catch (e: any) {
    await setStatus("failed", { error: e?.message ?? "未知錯誤", finished_at: new Date().toISOString() });
    yield { type: "error", error: e?.message ?? "未知錯誤" };
    yield { type: "done", status: "failed", summary: "任務發生錯誤。" };
  }
}
