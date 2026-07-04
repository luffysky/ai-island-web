/**
 * Creator Engine — Workflows（E7 工作流錄製，精簡 v1）
 * record：把剛剛做的動作序列存成可重用工作流（asset）。replay：對選定碎片依序重跑各步。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getFragmentsByIds } from "@/lib/creator-engine/fragments";
import { synthesize, evolve, compose, transcreate } from "@/lib/creator-engine/ai/agents";

export type WorkflowStep = { agent: "synthesize" | "evolve" | "compose" | "transcreate"; params?: Record<string, any> };

const COLS = "id, workspace_id, created_by, title, description, steps, version, visibility, created_at, updated_at";

export async function createWorkflow(workspaceId: string, userId: string, title: string, steps: WorkflowStep[]) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_workflows")
    .insert({ workspace_id: workspaceId, created_by: userId, title: title.slice(0, 120), steps: steps.slice(0, 30) })
    .select(COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listWorkflows(workspaceId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_workflows").select(COLS).eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function workflowWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_workflows").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}

/** Replay：對選定碎片依序重跑各步（v1：每步獨立跑、收集輸出）。 */
export async function runWorkflow(workspaceId: string, userId: string, workflowId: string, fragmentIds: string[]) {
  const admin = createSupabaseAdmin();
  const { data: wf } = await admin.from("ci_workflows").select("steps").eq("id", workflowId).maybeSingle();
  const steps = ((wf as any)?.steps ?? []) as WorkflowStep[];
  const { data: runRow } = await admin.from("ci_workflow_runs")
    .insert({ workflow_id: workflowId, workspace_id: workspaceId, started_by: userId, input: { fragmentIds }, status: "running" })
    .select("id").single();
  const runId = (runRow as any)?.id;

  const seed = await getFragmentsByIds(workspaceId, fragmentIds);
  // 真 pipeline：每步的產出成為下一步的輸入（current 工作集）。
  let current: { id: string; title: string; content: string }[] = seed;
  const results: any[] = [];
  let stepIdx = 0;
  for (const step of steps) {
    stepIdx++;
    try {
      if (step.agent === "synthesize" && current.length >= 2) {
        const r = await synthesize(workspaceId, userId, current);
        results.push({ agent: "synthesize", ok: true, output: r.result });
        // 凝聚出的核心點子 → 下一步的單一輸入
        current = [{ id: `syn${stepIdx}`, title: r.result.title, content: `${r.result.coreIdea}\n\n${r.result.summary}` }];
      } else if (step.agent === "evolve" && current[0]) {
        const r = await evolve(workspaceId, userId, current, step.params?.count ?? 6);
        results.push({ agent: "evolve", ok: true, output: r.result });
        // 演化出的變體 → 下一步的工作集
        current = r.result.variants.map((v, i) => ({ id: `ev${stepIdx}_${i}`, title: v.title, content: v.content }));
      } else if (step.agent === "compose" && current.length >= 1) {
        const r = await compose(workspaceId, userId, step.params?.workType ?? "article", current);
        results.push({ agent: "compose", ok: true, output: r.result });
        // compose 為終端；把成品文字帶下去（若後面還有步驟，如 transcreate）
        const body = (r.result as any).body ?? (r.result as any).lyricsSectioned ?? "";
        current = [{ id: `cmp${stepIdx}`, title: r.result.title, content: body }];
      } else if (step.agent === "transcreate" && current[0]) {
        const r = await transcreate(workspaceId, userId, `${current[0].title}\n${current[0].content}`, step.params?.targetLanguage ?? "English", step.params?.targetCulture ?? "natural");
        results.push({ agent: "transcreate", ok: true, output: r.result });
        current = [{ id: `tr${stepIdx}`, title: current[0].title, content: r.result.output }];
      } else {
        results.push({ agent: step.agent, ok: false, error: "input_not_met" });
      }
    } catch (e) {
      results.push({ agent: step.agent, ok: false, error: (e as Error).message });
    }
  }
  await admin.from("ci_workflow_runs").update({ status: "succeeded", result: results }).eq("id", runId);
  return { runId, results };
}
