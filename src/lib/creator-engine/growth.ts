/**
 * Creator Engine — Growth + Creator DNA（E9）。personal-scoped。
 * stats 即時算；DNA 用 AI 從創作者素材歸納、存 ci_creator_dna。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { analyzeDNA, coach } from "@/lib/creator-engine/ai/agents";
import { createCandidateMemory } from "@/lib/creator-engine/memory";

/**
 * 成長統計。傳 workspaceId → 只算「這個工作室」的（個人島也是一個 workspace）；
 * 不傳 → 該使用者跨所有工作室加總（舊行為）。
 * 一個人可以有多個工作室，碎片/作品本來就綁 workspace，所以要能分開看。
 */
/** Creator 等級：由 creator_xp 換算（每級門檻遞增）。 */
export function creatorLevel(xp: number): { level: number; cur: number; next: number } {
  // 需求 XP：L 級 = 50 * L * (L+1) / 2 累積；簡化用平方根
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
  const need = (l: number) => 50 * ((l - 1) * l) / 2;
  return { level, cur: xp - need(level), next: need(level + 1) - need(level) };
}

export async function getStats(userId: string, workspaceId?: string | null): Promise<{ fragments: number; works: number; aiRuns: number; creatorXp: number; creatorLevel: number }> {
  const admin = createSupabaseAdmin();
  const scope = <T extends { eq: (col: string, val: string) => T }>(q: T) =>
    (workspaceId ? q.eq("workspace_id", workspaceId) : q);
  const [f, w, r, s] = await Promise.all([
    scope(admin.from("ci_fragments").select("id", { count: "exact", head: true }).eq("created_by", userId) as any),
    scope(admin.from("ci_works").select("id", { count: "exact", head: true }).eq("created_by", userId) as any),
    scope(admin.from("ci_agent_runs").select("id", { count: "exact", head: true }).eq("user_id", userId) as any),
    admin.from("ci_creator_stats").select("creator_xp").eq("user_id", userId).maybeSingle(),
  ]);
  const creatorXp = (s.data as any)?.creator_xp ?? 0;
  return { fragments: f.count ?? 0, works: w.count ?? 0, aiRuns: r.count ?? 0, creatorXp, creatorLevel: creatorLevel(creatorXp).level };
}

/** #91 累加 Creator XP（創作行為觸發，冪等靠 upsert 增量）。fire-and-forget。 */
export async function bumpCreatorXp(userId: string, delta: number): Promise<void> {
  if (!userId || delta <= 0) return;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_creator_stats").select("creator_xp").eq("user_id", userId).maybeSingle();
  const cur = (data as any)?.creator_xp ?? 0;
  await admin.from("ci_creator_stats").upsert({ user_id: userId, creator_xp: cur + delta, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).then(() => {}, () => {});
}

/** AI 教練：用 stats + DNA + 近期題材給本週建議。核心動作、免費（Cost Manager coach=0）。 */
export async function getCoachAdvice(userId: string, workspaceId: string): Promise<{ advice: any } | { error: string }> {
  const admin = createSupabaseAdmin();
  const [stats, dna, { data: frags }] = await Promise.all([
    getStats(userId, workspaceId),
    getDNA(userId),
    admin.from("ci_fragments").select("title").eq("created_by", userId).order("created_at", { ascending: false }).limit(15),
  ]);
  const samples = (((frags as any[]) ?? []).map((f) => f.title as string)).filter(Boolean);
  if (stats.fragments + stats.works < 2) return { error: "samples_too_few" };
  try {
    const { result } = await coach(workspaceId, userId, { stats, dna: dna?.traits ?? null, samples });
    return { advice: result };
  } catch (e) {
    return { error: (e as Error).message };
  }
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
    // #92 candidate 推論：把 DNA 特徵轉成「候選記憶」待創作者確認（fire-and-forget、免額外 LLM）
    const t = result as any;
    const cands: string[] = [];
    if (t.tone) cands.push(`語氣傾向：${t.tone}`);
    if (Array.isArray(t.imagery) && t.imagery.length) cands.push(`常用意象：${t.imagery.slice(0, 5).join("、")}`);
    if (Array.isArray(t.strengths) && t.strengths.length) cands.push(`創作強項：${t.strengths.slice(0, 3).join("、")}`);
    void Promise.all(cands.map((text) => createCandidateMemory({ scope: "personal", userId, kind: "style", text })));
    return { traits: result };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
