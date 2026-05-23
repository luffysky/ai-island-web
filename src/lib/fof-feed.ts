/**
 * 演算法 #6 — Friends-of-Friends 推薦 feed
 *
 * 在 AI 島語境下「朋友」沒明確社交圖、我們用代理訊號：
 *  - 同章節 / 同 lesson 完成 → 視為「同學」
 *  - 互相 forum 回覆 → 視為「對話過」
 *  - blog like → 視為「欣賞」
 *
 * 排序權重：
 *  - 第一度（直接同學 / 對話過）= weight 3
 *  - 第二度（朋友的朋友）= weight 1.5
 *  - 陌生人 = weight 1
 *  - × HN-style time decay
 *  - 完成同章節數越多、加權越多（linear）
 */

export type FeedEvent = {
  kind: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string;
  link?: string;
  at: string;
};

export type AffinityMap = Map<string, number>; // userId → affinity score（0+）

/**
 * 依 currentUser 跟其他人共同完成的 lesson / chapter 數、算出 affinity。
 * 輸入：currentUser 完成的 lessonIds、其他人完成的 (userId, lessonId)
 */
export function calcAffinity(
  myLessonIds: Set<string>,
  othersProgress: Array<{ user_id: string; lesson_id: string }>
): AffinityMap {
  const map: AffinityMap = new Map();
  for (const r of othersProgress) {
    if (!myLessonIds.has(r.lesson_id)) continue;
    map.set(r.user_id, (map.get(r.user_id) ?? 0) + 1);
  }
  return map;
}

/**
 * 依 forum 互動加 affinity（對方回過我的、weight 2）
 */
export function addForumAffinity(map: AffinityMap, forumPairs: Array<{ user_id: string; weight: number }>) {
  for (const r of forumPairs) {
    map.set(r.user_id, (map.get(r.user_id) ?? 0) + r.weight);
  }
  return map;
}

/**
 * 排序 feed events：affinity + 時間衰減
 *
 *   score = (1 + affinity) × decay
 *   decay = 1 / (ageHours + 2) ^ 1.2
 */
export function rankFeed(events: FeedEvent[], affinity: AffinityMap, now: number = Date.now()): FeedEvent[] {
  return [...events].sort((a, b) => scoreEvent(b, affinity, now) - scoreEvent(a, affinity, now));
}

function scoreEvent(e: FeedEvent, affinity: AffinityMap, now: number): number {
  const aff = affinity.get(e.user_id) ?? 0;
  const ageH = Math.max(0, (now - new Date(e.at).getTime()) / 3_600_000);
  const decay = 1 / Math.pow(ageH + 2, 1.2);
  return (1 + aff) * decay;
}
