/** FIE M5 — Feedback Loop：創作者對 candidate 採納/否決 → 寫 ci_reasoning_feedback + 回寫 ci_memories 影響後續推理。 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createMemory } from "@/lib/creator-engine/memory";

export async function recordFeedback(
  userId: string, runId: string, candidateId: string, verdict: "accepted" | "rejected" | "edited", note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdmin();
  const { data: run } = await admin.from("ci_reasoning_runs").select("workspace_id").eq("id", runId).maybeSingle();
  const wsId = (run as any)?.workspace_id as string | undefined;
  if (!wsId) return { ok: false, error: "run_not_found" };
  const { data: cand } = await admin.from("ci_reasoning_candidates").select("content").eq("id", candidateId).eq("run_id", runId).maybeSingle();
  if (!cand) return { ok: false, error: "candidate_not_found" };

  await admin.from("ci_reasoning_feedback").insert({ candidate_id: candidateId, run_id: runId, workspace_id: wsId, user_id: userId, verdict, note: note ?? null });

  // 回寫記憶（有 embedding → 影響後續語意檢索/對齊）
  const c: any = (cand as any).content;
  if (verdict === "accepted") {
    await createMemory({ scope: "workspace", workspaceId: wsId, kind: "reasoning_feedback", text: `採納的推理方向：「${c.title}」——${String(c.rationale || c.body || "").slice(0, 200)}`, status: "active", source: "agent_run" }).catch(() => {});
  } else if (verdict === "rejected") {
    await createMemory({ scope: "workspace", workspaceId: wsId, kind: "reasoning_reject", text: `已否決的方向：「${c.title}」（後續請避免類似）`, status: "active", source: "agent_run" }).catch(() => {});
  }
  return { ok: true };
}

/** 取一次 run 的完整 trace + candidates（回放用）。 */
export async function getReasoningRun(runId: string) {
  const admin = createSupabaseAdmin();
  const [{ data: run }, { data: candidates }, { data: trace }] = await Promise.all([
    admin.from("ci_reasoning_runs").select("id, workspace_id, mode, input, observation, status, created_at").eq("id", runId).maybeSingle(),
    admin.from("ci_reasoning_candidates").select("id, rank, content, confidence, weight, evidence_ids").eq("run_id", runId).order("rank"),
    admin.from("ci_reasoning_trace").select("step_no, stage, detail").eq("run_id", runId).order("step_no"),
  ]);
  if (!run) return null;
  return { run, candidates: (candidates as any[]) ?? [], trace: (trace as any[]) ?? [] };
}
