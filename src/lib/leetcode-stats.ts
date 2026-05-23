/**
 * Leetcode stats fetcher
 * 用 https://github.com/JeremyTsaii/leetcode-stats-api（社群免費 wrapper）
 * 也可以自己 host、改 LEETCODE_STATS_URL env
 */

const STATS_URL = process.env.LEETCODE_STATS_URL ?? "https://leetcode-stats-api.herokuapp.com";

export type LeetcodeStats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalQuestions: number;
  easyTotal: number;
  mediumTotal: number;
  hardTotal: number;
  acceptanceRate: number;
  ranking: number;
  contributionPoints?: number;
  reputation?: number;
  fetchedAt: string;
};

export async function fetchLeetcodeStats(username: string): Promise<LeetcodeStats | { error: string }> {
  if (!username || !/^[a-zA-Z0-9_-]{1,40}$/.test(username)) {
    return { error: "invalid_username" };
  }
  try {
    const res = await fetch(`${STATS_URL}/${encodeURIComponent(username)}`, {
      // 5 秒 timeout
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "ai-island/1.0" },
    });
    if (!res.ok) return { error: `http_${res.status}` };
    const data = await res.json();
    if (data.status === "error" || !data.totalSolved) {
      return { error: data.message ?? "no_data" };
    }
    return {
      username,
      totalSolved: data.totalSolved ?? 0,
      easySolved: data.easySolved ?? 0,
      mediumSolved: data.mediumSolved ?? 0,
      hardSolved: data.hardSolved ?? 0,
      totalQuestions: data.totalQuestions ?? 0,
      easyTotal: data.totalEasy ?? data.easyTotal ?? 0,
      mediumTotal: data.totalMedium ?? data.mediumTotal ?? 0,
      hardTotal: data.totalHard ?? data.hardTotal ?? 0,
      acceptanceRate: Number(data.acceptanceRate ?? 0),
      ranking: Number(data.ranking ?? 0),
      contributionPoints: data.contributionPoints,
      reputation: data.reputation,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { error: (e as any)?.message ?? "fetch_failed" };
  }
}
