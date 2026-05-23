/**
 * 演算法 #3 — Hacker News 風格排序
 *
 * score = (likes + 1) × log2(replies + 2) / (ageHours + 2) ^ 1.5
 *
 * 直覺：
 *  - 讚數線性加權（+1 避免 0 變 0）
 *  - 回覆數開 log（避免幾百回覆完全蓋過新文）
 *  - 時間衰減用 1.5 次方（HN 是 1.8、社群型可弱一點讓熱門撐久）
 */

export type ForumPost = {
  id: string;
  created_at: string | Date;
  like_count?: number | null;
  reply_count?: number | null;
};

export function hnScore(post: ForumPost, now: number = Date.now()): number {
  const likes = post.like_count ?? 0;
  const replies = post.reply_count ?? 0;
  const created = typeof post.created_at === "string" ? new Date(post.created_at).getTime() : post.created_at.getTime();
  const ageHours = Math.max(0, (now - created) / 3_600_000);
  const replyBoost = Math.log2(replies + 2);
  const decay = Math.pow(ageHours + 2, 1.5);
  return (likes + 1) * replyBoost / decay;
}

export function sortByHnScore<T extends ForumPost>(posts: T[]): T[] {
  const now = Date.now();
  return [...posts].sort((a, b) => hnScore(b, now) - hnScore(a, now));
}
