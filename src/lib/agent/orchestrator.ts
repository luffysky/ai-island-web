// Agent Core — 任務規劃/工具決策 loop。對齊 docs/agent_platform_plan.md §2/§4/§9。
// 流程：讀目標 → LLM 規劃下一步(工具+參數) → 權限判斷(read 自動 / write,dangerous 要確認) →
//        執行工具 → 記錄 step → 回饋觀察給 LLM → 直到 LLM 說 done 或達 max_steps。
// 以 async generator 吐事件，讓 API route 轉成 SSE。approval 用「寫 DB pending row + 輪詢」等前端決定。
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { getTool, describeTools, needsApproval, approvalSummary, type ToolResult } from "./tools";
import { getOnlineDevice, dispatchToDevice } from "./bridge";
import { sendPushToUser } from "@/lib/web-push";

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
- 盡量少步數完成；拿到足夠資訊就 done。`;

async function planNext(goal: string, history: StepRow[]): Promise<Decision | null> {
  const hist = history.map((s) =>
    `#${s.idx} ${s.toolName ?? "?"}(${JSON.stringify(s.args ?? {})}) → ${s.ok ? "ok" : "fail"}: ${JSON.stringify(s.result ?? {}).slice(0, 400)}`
  ).join("\n") || "（尚無步驟）";
  const user = `目標：${goal}

可用工具：
${describeTools()}

目前進度：
${hist}

請只回下一步的 JSON。`;
  const res = await completeForUsage("agent_core", { system: PLANNER_SYSTEM, user, maxTokens: 700, defaultModel: "claude-haiku-4-5-20251001" });
  return parseDecision(res.text);
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

/** 跑一個任務，吐事件流。API route 消費它轉 SSE。 */
export async function* runAgentTask(taskId: string, userId: string, goal: string, maxSteps = 20): AsyncGenerator<AgentEvent> {
  const admin = createSupabaseAdmin();
  const history: StepRow[] = [];
  const setStatus = async (status: string, patch: Record<string, unknown> = {}) => {
    await admin.from("agent_tasks").update({ status, ...patch }).eq("id", taskId);
  };

  yield { type: "status", status: "planning" };
  await setStatus("running");

  try {
    for (let idx = 0; idx < maxSteps; idx++) {
      // 取消？
      const { data: cur } = await admin.from("agent_tasks").select("status").eq("id", taskId).single();
      if (cur?.status === "cancelled") { yield { type: "done", status: "cancelled", summary: "任務已取消" }; return; }

      const decision = await planNext(goal, history);
      if (!decision) {
        await setStatus("failed", { error: "規劃失敗（模型未回有效 JSON）", finished_at: new Date().toISOString() });
        yield { type: "error", error: "規劃失敗：模型未回有效指令" };
        yield { type: "done", status: "failed", summary: "抱歉，我沒能規劃出下一步。" };
        return;
      }
      if (decision.thought) yield { type: "thought", idx, thought: decision.thought };

      if (decision.done || !decision.tool) {
        const summary = decision.summary ?? "完成。";
        await setStatus("succeeded", { result: { summary }, step_count: idx, finished_at: new Date().toISOString() });
        pushSafe(userId, "✅ Agent 完成任務", summary, taskId, `agent-done-${taskId}`);
        yield { type: "done", status: "succeeded", summary };
        return;
      }

      const tool = getTool(decision.tool);
      const row: StepRow = { idx, thought: decision.thought, toolName: decision.tool, risk: tool?.risk, args: decision.args };
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
      let result: ToolResult;
      try {
        if (tool.needsDevice) {
          const device = await getOnlineDevice(userId);
          if (!device) {
            result = { ok: false, error: "沒有連接中的『AI 島桌面助手』。請先在電腦上安裝並啟動、於 /agent 完成配對。" };
          } else {
            result = await dispatchToDevice(taskId, userId, device.id, idx, tool.name, decision.args ?? {});
          }
        } else {
          result = await tool.execute(decision.args ?? {}, { userId, taskId });
        }
      } catch (e: any) { result = { ok: false, error: e?.message ?? "工具執行例外" }; }
      row.ok = result.ok; row.result = result.ok ? result.data : { error: result.error };
      history.push(row);
      await admin.from("agent_steps").insert({
        task_id: taskId, idx, thought: row.thought, tool_name: tool.name, risk: tool.risk,
        args: decision.args ?? {}, result: row.result, ok: result.ok, verified: result.ok,
      });
      await admin.from("agent_tasks").update({ step_count: idx + 1 }).eq("id", taskId);
      yield { type: "step", step: row };
    }

    // 用完步數
    await setStatus("failed", { error: "達到最大步數", finished_at: new Date().toISOString() });
    pushSafe(userId, "⚠️ Agent 任務未完成", `已達最大步數（${maxSteps}）`, taskId, `agent-done-${taskId}`);
    yield { type: "done", status: "failed", summary: `已達最大步數（${maxSteps}）仍未完成。` };
  } catch (e: any) {
    await setStatus("failed", { error: e?.message ?? "未知錯誤", finished_at: new Date().toISOString() });
    yield { type: "error", error: e?.message ?? "未知錯誤" };
    yield { type: "done", status: "failed", summary: "任務發生錯誤。" };
  }
}
