/**
 * Creator Engine — Growth + Creator DNA（E9）。personal-scoped。
 * stats 即時算；DNA 用 AI 從創作者素材歸納、存 ci_creator_dna。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { analyzeDNA } from "@/lib/creator-engine/ai/agents";

/**
 * 成長統計。傳 workspaceId → 只算「這個工作室」的（個人島也是一個 workspace）；
 * 不傳 → 該使用者跨所有工作室加總（舊行為）。
 * 一個人可以有多個工作室，碎片/作品本來就綁 workspace，所以要能分開看。
 */
export async function getStats(userId: string, workspaceId?: string | null): Promise<{ fragments: number; works: number; aiRuns: number }> {
  const admin = createSupabaseAdmin();
  const scope = <T extends { eq: (col: string, val: string) => T }>(q: T) =>
    (workspaceId ? q.eq("workspace_id", workspaceId) : q);
  const [f, w, r] = await Promise.all([
    scope(admin.from("ci_fragments").select("id", { count: "exact", head: true }).eq("created_by", userId) as any),
    scope(admin.from("ci_works").select("id", { count: "exact", head: true }).eq("created_by", userId) as any),
    scope(admin.from("ci_agent_runs").select("id", { count: "exact", head: true }).eq("user_id", userId) as any),
  ]);
  return { fragments: f.count ?? 0, works: w.count ?? 0, aiRuns: r.count ?? 0 };
}

export async function getDNA(userId: string): Promise<{ traits: any; confidence: number; updated_at: string } | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_creator_dna").select("traits, confidence, updated_at").eq("user_id", userId).maybeSingle();
  return (data as any) ?? null;
}

/** 重算創作 DNA：抓使用者素材 → AI 歸納 → upsert。需 active workspace 供 agent_run 記錄。 */
export async function computeDNA(userId: string, workspaceId: string): Promise<{ traits: any } | { error: string }> {
  const admin = createSupabaseAdmin();
  const [{ data: frags }, { data: works }] = await Promise.all([
    admin.from("ci_fragments").select("title, content").eq("created_by", userId).order("created_at", { ascending: false }).limit(25),
    admin.from("ci_works").select("title, body").eq("created_by", userId).order("updated_at", { ascending: false }).limit(8),
  ]);
  const samples = [
    ...(((frags as any[]) ?? []).map((f) => `${f.title} ${f.content ?? ""}`.trim())),
    ...(((works as any[]) ?? []).map((w) => `${w.title} ${(w.body ?? "").slice(0, 300)}`.trim())),
  ].filter(Boolean);
  if (samples.length < 3) return { error: "samples_too_few" };

  try {
    const { result } = await analyzeDNA(workspaceId, userId, samples);
    const confidence = Math.min(1, 0.4 + samples.length * 0.02);
    await admin.from("ci_creator_dna").upsert(
      { user_id: userId, traits: result, confidence, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    return { traits: result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
