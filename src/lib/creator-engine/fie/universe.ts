/**
 * 🌌 碎片宇宙：從使用者累積的碎片歸納「創作洞察」。
 * stats（分布/時間跨度）即時算；AI 洞察報告算一次快取進 ci_creator_stats.universe。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { universeInsight } from "@/lib/creator-engine/ai/agents";

const RARITY = new Set(["N", "R", "SR", "SSR", "UR", "碎片蛋"]);

export type UniverseStats = {
  count: number;
  categories: { name: string; count: number }[];
  moods: { name: string; count: number }[];
  topTags: { name: string; count: number }[];
  firstAt: string | null;
  lastAt: string | null;
  spanDays: number;
  activeMonths: number;
};

export type UniverseReport = {
  headline: string; hiddenCore: string; throughLine: string;
  themes: { name: string; essence: string }[]; surprising: string; encouragement: string;
};

/** 撈使用者全部碎片、算分布（分頁避免 1000 截斷）。 */
export async function gatherUniverseStats(userId: string): Promise<{ stats: UniverseStats; samples: string[] }> {
  const admin = createSupabaseAdmin();
  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; from < 6000; from += PAGE) {
    const { data } = await admin.from("ci_fragments")
      .select("title, content, category, mood, tags, created_at")
      .eq("created_by", userId).order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    const chunk = (data as any[]) ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const catMap = new Map<string, number>(), moodMap = new Map<string, number>(), tagMap = new Map<string, number>();
  const monthSet = new Set<string>();
  for (const r of rows) {
    if (r.category) catMap.set(r.category, (catMap.get(r.category) ?? 0) + 1);
    if (r.mood) moodMap.set(r.mood, (moodMap.get(r.mood) ?? 0) + 1);
    for (const t of Array.isArray(r.tags) ? r.tags : []) {
      const tag = String(t).trim();
      if (!tag || RARITY.has(tag.toUpperCase()) || RARITY.has(tag)) continue;
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
    if (r.created_at) monthSet.add(String(r.created_at).slice(0, 7));
  }
  const sortTop = (m: Map<string, number>, n: number) =>
    [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, n);

  const firstAt = rows[0]?.created_at ?? null;
  const lastAt = rows[rows.length - 1]?.created_at ?? null;
  const spanDays = firstAt && lastAt ? Math.max(1, Math.round((new Date(lastAt).getTime() - new Date(firstAt).getTime()) / 86400000)) : 0;

  // AI 樣本：最近 40 個（含較有內容的），標題 + 內容節錄
  const samples = rows.slice(-60).reverse()
    .map((r) => `${r.title ?? ""} ${(r.content ?? "").slice(0, 160)}`.trim())
    .filter(Boolean).slice(0, 40);

  return {
    stats: {
      count: rows.length,
      categories: sortTop(catMap, 10),
      moods: sortTop(moodMap, 8),
      topTags: sortTop(tagMap, 14),
      firstAt, lastAt, spanDays,
      activeMonths: monthSet.size,
    },
    samples,
  };
}

/** 讀已快取的宇宙報告（+ 即時 stats）。 */
export async function getUniverse(userId: string): Promise<{ stats: UniverseStats; report: UniverseReport | null; generatedAt: string | null }> {
  const admin = createSupabaseAdmin();
  const [{ stats }, cached] = await Promise.all([
    gatherUniverseStats(userId),
    admin.from("ci_creator_stats").select("universe, universe_at").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    stats,
    report: ((cached.data as any)?.universe ?? null) as UniverseReport | null,
    generatedAt: (cached.data as any)?.universe_at ?? null,
  };
}

/** 重算宇宙洞察：gather → AI → 快取。素材太少回 error。 */
export async function computeUniverse(userId: string, workspaceId: string): Promise<{ report: UniverseReport; stats: UniverseStats } | { error: string }> {
  const { stats, samples } = await gatherUniverseStats(userId);
  if (stats.count < 8 || samples.length < 5) return { error: "samples_too_few" };
  try {
    const { result } = await universeInsight(workspaceId, userId, {
      samples,
      topThemes: [...stats.categories.map((c) => c.name), ...stats.topTags.map((t) => t.name)].slice(0, 12),
      moods: stats.moods.map((m) => m.name),
      count: stats.count, spanDays: stats.spanDays,
    });
    const admin = createSupabaseAdmin();
    await admin.from("ci_creator_stats").upsert(
      { user_id: userId, universe: result as any, universe_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    return { report: result as UniverseReport, stats };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
