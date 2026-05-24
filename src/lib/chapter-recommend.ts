/**
 * 演算法 #8 — Chapter 推薦
 *
 * Hybrid 策略：
 *  1. Collaborative filter（用戶相似度）— 找完成過跟我相似章節的 user、推他們做過但我沒做的
 *  2. 連續性 fallback — 沒夠多資料時、推「我做完的章節 +1」(同 stage 或 difficulty)
 *  3. 熱門度 fallback — 都不夠就推 site-wide 最多人完成的章節
 *
 * 用法：const recs = await recommendChapters(userId, 5)
 */

import { createSupabaseAdmin } from "./supabase-admin";

export type Recommendation = {
  chapterId: number;
  score: number;
  reason: "collab" | "continuation" | "popular";
};

export async function recommendChapters(
  userId: string,
  limit: number = 5,
): Promise<Recommendation[]> {
  const admin = createSupabaseAdmin();

  // Step 1: 拿我完成的 chapter set
  const { data: myProgress } = await admin
    .from("lesson_progress")
    .select("chapter_id")
    .eq("user_id", userId)
    .limit(5000);

  const myCompleted = new Set<number>(
    (myProgress ?? []).map((r: any) => r.chapter_id).filter(Number),
  );

  // 如果完成數 < 2、collab filter 沒意義、走 popular fallback
  if (myCompleted.size < 2) {
    return await popularFallback(myCompleted, limit);
  }

  // Step 2: 找「也完成過這些章節」的其他用戶
  const { data: peers } = await admin
    .from("lesson_progress")
    .select("user_id, chapter_id")
    .in("chapter_id", Array.from(myCompleted))
    .neq("user_id", userId)
    .limit(20000);

  // 算每個用戶跟我的「共同章節數」
  const peerShared = new Map<string, number>();
  const peerChapters = new Map<string, Set<number>>();
  for (const row of (peers as any[]) ?? []) {
    peerShared.set(row.user_id, (peerShared.get(row.user_id) ?? 0) + 1);
    if (!peerChapters.has(row.user_id)) peerChapters.set(row.user_id, new Set());
  }

  // 取 top 50 相似用戶
  const topPeers = Array.from(peerShared.entries())
    .filter(([_, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  if (topPeers.length === 0) {
    return await continuationFallback(myCompleted, limit);
  }

  // Step 3: 拿 top peer 的所有章節進度、找他們做過但我沒做的
  const peerIds = topPeers.map(([id]) => id);
  const { data: peerProgress } = await admin
    .from("lesson_progress")
    .select("user_id, chapter_id")
    .in("user_id", peerIds)
    .limit(20000);

  const peerSimMap = new Map(topPeers);
  const candidateScore = new Map<number, number>();
  for (const row of (peerProgress as any[]) ?? []) {
    const cid = Number(row.chapter_id);
    if (!cid || myCompleted.has(cid)) continue;
    const sim = peerSimMap.get(row.user_id) ?? 0;
    candidateScore.set(cid, (candidateScore.get(cid) ?? 0) + sim);
  }

  const ranked = Array.from(candidateScore.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([chapterId, score]): Recommendation => ({
      chapterId,
      score,
      reason: "collab",
    }));

  // 補不足、走 continuation
  if (ranked.length < limit) {
    const more = await continuationFallback(myCompleted, limit - ranked.length, new Set(ranked.map((r) => r.chapterId)));
    ranked.push(...more);
  }

  return ranked.slice(0, limit);
}

/** 連續性 fallback：推「下一個未完的章節 ID」 */
async function continuationFallback(
  myCompleted: Set<number>,
  limit: number,
  exclude: Set<number> = new Set(),
): Promise<Recommendation[]> {
  const admin = createSupabaseAdmin();
  const { data: chapters } = await admin
    .from("chapters")
    .select("id")
    .order("id", { ascending: true })
    .limit(100);

  const recs: Recommendation[] = [];
  for (const ch of (chapters as any[]) ?? []) {
    if (recs.length >= limit) break;
    const cid = Number(ch.id);
    if (myCompleted.has(cid) || exclude.has(cid)) continue;
    recs.push({ chapterId: cid, score: 1, reason: "continuation" });
  }
  return recs;
}

/** 熱門 fallback：site-wide 最多人完成的章節 */
async function popularFallback(
  myCompleted: Set<number>,
  limit: number,
): Promise<Recommendation[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("lesson_progress")
    .select("chapter_id")
    .limit(20000);

  const counts = new Map<number, number>();
  for (const r of (data as any[]) ?? []) {
    const cid = Number(r.chapter_id);
    if (!cid || myCompleted.has(cid)) continue;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([chapterId, score]): Recommendation => ({ chapterId, score, reason: "popular" }));
}
