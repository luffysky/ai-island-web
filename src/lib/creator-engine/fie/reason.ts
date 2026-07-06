/**
 * FIE Reasoning 編排器（M2 pipeline + M3 scoring + M4 modes + M5 trace）。
 * 沿用 runAgent(reason)、ci_related_fragments/ci_surprising_pairs、ci_creator_dna；寫 ci_reasoning_runs/candidates/trace。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { embedText } from "@/lib/ai-embeddings";
import { reason as reasonAgent } from "@/lib/creator-engine/ai/agents";
import { buildRepresentation } from "@/lib/creator-engine/fie/representation";
import { MODES, type ReasoningMode, type ReasoningResult, type ScoredCandidate, type ReasonOutput } from "@/lib/creator-engine/fie/types";

export function resolveMode(requested?: string, intent?: string): ReasoningMode {
  if (requested && (MODES as string[]).includes(requested)) return requested as ReasoningMode;
  // 決定性啟發式：intent 提到「突破/新/意外」→ exploratory；否則 adjacent（成長友善預設）
  const t = (intent ?? "").toLowerCase();
  if (/突破|創新|意外|不一樣|跳脫|新方向|explor/.test(t)) return "exploratory";
  return "adjacent";
}

type RawCandidate = { title: string; body: string; rationale: string; confidence: number; evidenceFragmentIds?: string[]; missing?: string[] };

/** M3 純函數：算每個 candidate 的 weight 並排序（不呼叫 AI，供單元測試）。 */
export function scoreCandidates(
  cands: RawCandidate[],
  mode: ReasoningMode,
  dnaTraits?: any,
): ScoredCandidate[] {
  const imagery: string[] = Array.isArray(dnaTraits?.imagery) ? dnaTraits.imagery : [];
  const strengths: string[] = Array.isArray(dnaTraits?.strengths) ? dnaTraits.strengths : [];
  const traitWords = [...imagery, ...strengths].filter(Boolean);

  const scored = cands.map((c) => {
    const evIds = c.evidenceFragmentIds ?? [];
    const missing = c.missing ?? [];
    const evidenceFactor = 1 + Math.min(0.5, evIds.length * 0.1);
    const base = c.confidence * evidenceFactor;
    const novelty = Math.min(0.4, missing.length * 0.08);
    // Creator 對齊：candidate 文字命中 DNA 特徵 → alignment 加分
    const hay = `${c.title}${c.body}${c.rationale}`;
    const alignHits = traitWords.filter((w) => hay.includes(w)).length;
    const alignment = Math.min(0.4, alignHits * 0.12);
    let weight: number;
    if (mode === "exploratory") weight = base * 0.7 + novelty * 0.8 + alignment * 0.3;
    else if (mode === "adjacent") weight = base * 0.9 + novelty * 0.3 + alignment * 0.6;
    else weight = base + alignment * 0.8; // familiar：偏對齊/穩健
    return {
      title: c.title, body: c.body, rationale: c.rationale, confidence: c.confidence,
      weight: Math.round(weight * 10000) / 10000,
      evidenceIds: evIds, missing, rank: 0,
    };
  });
  scored.sort((a, b) => b.weight - a.weight);
  scored.forEach((c, i) => { c.rank = i + 1; });
  return scored;
}

/** 依 mode 取 evidence 候選碎片（Familiar/Adjacent=語意近鄰；Exploratory=意外配對）。 */
async function retrieveEvidence(admin: any, workspaceId: string, seedIds: string[], seedText: string, mode: ReasoningMode): Promise<{ id: string; title: string }[]> {
  try {
    if (mode === "exploratory") {
      const { data } = await admin.rpc("ci_surprising_pairs", { p_workspace: workspaceId, match_count: 8 });
      const ids = Array.from(new Set(((data as any[]) ?? []).flatMap((p) => [p.a_id, p.b_id]))).filter((id) => !seedIds.includes(id as string));
      if (!ids.length) return [];
      const { data: f } = await admin.from("ci_fragments").select("id, title").in("id", ids.slice(0, 10));
      return (f as any[]) ?? [];
    }
    const vec = await embedText(seedText.slice(0, 4000)).catch(() => null);
    if (!vec) return [];
    const { data } = await admin.rpc("ci_related_fragments", { p_workspace: workspaceId, p_embedding: `[${vec.join(",")}]`, p_exclude: seedIds[0] ?? null, match_count: mode === "adjacent" ? 8 : 5 });
    return ((data as any[]) ?? []).filter((r) => !seedIds.includes(r.id)).map((r) => ({ id: r.id, title: r.title }));
  } catch { return []; }
}

export async function runReasoning(opts: {
  workspaceId: string; userId: string; seedFragmentIds: string[]; mode?: string; intent?: string; maxCandidates?: number;
}): Promise<ReasoningResult> {
  const admin = createSupabaseAdmin();
  const mode = resolveMode(opts.mode, opts.intent);
  const seedIds = opts.seedFragmentIds.slice(0, 20);

  // 開一筆 run（pending）
  const { data: runRow } = await admin.from("ci_reasoning_runs").insert({
    workspace_id: opts.workspaceId, user_id: opts.userId, mode, input: { seedFragmentIds: seedIds, intent: opts.intent ?? null }, status: "pending",
  }).select("id").single();
  const runId = (runRow as any)?.id as string;
  const trace: { step_no: number; stage: string; detail: any }[] = [];
  const addTrace = (stage: string, detail: any) => trace.push({ step_no: trace.length + 1, stage, detail });

  try {
    // seeds 內容（representation / evidence 都要用，先撈）
    const { data: seedFrags } = await admin.from("ci_fragments").select("id, title, content").in("id", seedIds);
    const seeds = (seedFrags as any[]) ?? [];
    const seedText = seeds.map((s) => `${s.title} ${s.content ?? ""}`).join("\n").slice(0, 6000);

    // M1 Representation + M4 evidence 併行跑（各自都含 embedding 往返、序列會疊加成 timeout）。
    const [repr, evidence] = await Promise.all([
      buildRepresentation(opts.workspaceId, seedIds),
      retrieveEvidence(admin, opts.workspaceId, seedIds, seedText, mode),
    ]);
    addTrace("observation", { representation: repr });
    addTrace("evidence", { mode, source: mode === "exploratory" ? "ci_surprising_pairs" : "ci_related_fragments", evidence });

    // M2 推理
    const { result, agentRunId } = await reasonAgent(opts.workspaceId, opts.userId, { seeds: seeds.map((s) => ({ id: s.id, title: s.title, content: s.content ?? "" })), mode, evidence, intent: opts.intent });
    addTrace("hypothesis", { observation: result.observation, rawCandidates: result.candidates.length });
    addTrace("missing", { missing: result.candidates.flatMap((c) => c.missing) });

    // M3 + M4 對齊評分
    const { data: dna } = await admin.from("ci_creator_dna").select("traits").eq("user_id", opts.userId).maybeSingle();
    let scored = scoreCandidates(result.candidates, mode, (dna as any)?.traits);
    const cap = Math.max(2, Math.min(8, opts.maxCandidates ?? 4));
    scored = scored.slice(0, cap);
    addTrace("candidate", { candidates: scored.map((c) => ({ rank: c.rank, title: c.title, confidence: c.confidence, weight: c.weight })) });
    addTrace("alignment", { dna: !!(dna as any)?.traits, mode });

    // 寫 candidates
    if (scored.length) {
      await admin.from("ci_reasoning_candidates").insert(scored.map((c) => ({
        run_id: runId, workspace_id: opts.workspaceId, rank: c.rank,
        content: { title: c.title, body: c.body, rationale: c.rationale, missing: c.missing },
        confidence: c.confidence, weight: c.weight, evidence_ids: c.evidenceIds.filter((id) => seedIds.includes(id) || evidence.some((e) => e.id === id)),
      })));
    }
    // 寫 trace
    await admin.from("ci_reasoning_trace").insert(trace.map((t) => ({ run_id: runId, workspace_id: opts.workspaceId, step_no: t.step_no, stage: t.stage, detail: t.detail })));
    // 收尾 run
    await admin.from("ci_reasoning_runs").update({
      agent_run_id: agentRunId, observation: result.observation, hypothesis: scored[0]?.title ?? null,
      evidence: evidence, missing: result.candidates.flatMap((c) => c.missing), candidate: scored[0] ?? null, status: "done",
    }).eq("id", runId);

    return { runId, agentRunId, mode, observation: result.observation, candidates: scored };
  } catch (e) {
    await admin.from("ci_reasoning_runs").update({ status: "failed" }).eq("id", runId).then(() => {}, () => {});
    throw e;
  }
}
