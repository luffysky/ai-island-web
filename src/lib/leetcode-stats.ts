/**
 * Leetcode stats fetcher — 直打 LeetCode 官方 GraphQL API、不依賴第三方
 *
 * 之前用 https://leetcode-stats-api.herokuapp.com、但 Heroku 2022 底停免費 dyno、
 * 整個 endpoint 死掉、任何 user 綁定都會回「無資料」(bugpic 52/53)。
 *
 * 現在改打 https://leetcode.com/graphql、官方公開 endpoint、不需 auth。
 * 失敗只有兩種情境：
 *   1. username 真的不存在 → matchedUser null
 *   2. LeetCode 整個 down → fetch fail
 */

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

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

const PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
      profile {
        ranking
        reputation
      }
      contributions { points }
    }
    allQuestionsCount { difficulty count }
  }
`;

export async function fetchLeetcodeStats(username: string): Promise<LeetcodeStats | { error: string }> {
  if (!username || !/^[a-zA-Z0-9_-]{1,40}$/.test(username)) {
    return { error: "invalid_username" };
  }
  try {
    const res = await fetch(LEETCODE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ai-island/1.0)",
        // Referer 帶 user profile URL、LeetCode 對 graphql 比較友善
        "Referer": `https://leetcode.com/u/${username}/`,
      },
      body: JSON.stringify({ query: PROFILE_QUERY, variables: { username } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { error: `http_${res.status}` };
    const json = await res.json();
    if (json.errors) {
      return { error: json.errors[0]?.message ?? "graphql_error" };
    }
    const matched = json?.data?.matchedUser;
    if (!matched) return { error: "user_not_found" };

    // 解析 ac submission：acSubmissionNum 是 array、含 All / Easy / Medium / Hard
    const acStats: Array<{ difficulty: string; count: number }> = matched.submitStatsGlobal?.acSubmissionNum ?? [];
    const byDiff: Record<string, number> = {};
    for (const s of acStats) byDiff[s.difficulty] = s.count;

    const totalQs: Array<{ difficulty: string; count: number }> = json?.data?.allQuestionsCount ?? [];
    const totalByDiff: Record<string, number> = {};
    for (const t of totalQs) totalByDiff[t.difficulty] = t.count;

    const totalSolved = byDiff.All ?? 0;
    const totalQuestions = totalByDiff.All ?? 0;
    const acceptanceRate = totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 1000) / 10 : 0;

    return {
      username: matched.username ?? username,
      totalSolved,
      easySolved: byDiff.Easy ?? 0,
      mediumSolved: byDiff.Medium ?? 0,
      hardSolved: byDiff.Hard ?? 0,
      totalQuestions,
      easyTotal: totalByDiff.Easy ?? 0,
      mediumTotal: totalByDiff.Medium ?? 0,
      hardTotal: totalByDiff.Hard ?? 0,
      acceptanceRate,
      ranking: Number(matched.profile?.ranking ?? 0),
      contributionPoints: matched.contributions?.points ?? 0,
      reputation: matched.profile?.reputation ?? 0,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { error: (e as any)?.message ?? "fetch_failed" };
  }
}
