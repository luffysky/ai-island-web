/**
 * LeetCode 題庫 fetcher — 共用 helper、給 oneshot scrape + cron 增量都用
 *
 * 直打 LeetCode 官方 GraphQL、不需登入、free 題公開。
 * Premium 題只拿 metadata（title / slug / tags / paidOnly=true）、不拿內文。
 */

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const PROBLEMSET_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        acRate
        difficulty
        questionFrontendId
        title
        titleSlug
        topicTags { name slug }
        paidOnly: isPaidOnly
      }
    }
  }
`;

export type LeetcodeProblem = {
  number: number;        // questionFrontendId
  slug: string;          // titleSlug
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];        // topicTags[*].slug
  isPremium: boolean;    // paidOnly
  url: string;           // https://leetcode.com/problems/{slug}/
  acRate: number;
};

async function fetchPage(skip: number, limit: number): Promise<{ total: number; questions: LeetcodeProblem[] }> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; ai-island/1.0)",
      "Referer": "https://leetcode.com/problemset/all/",
    },
    body: JSON.stringify({
      query: PROBLEMSET_QUERY,
      variables: {
        categorySlug: "",
        limit,
        skip,
        filters: {},
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "graphql_error");
  const list = json?.data?.problemsetQuestionList;
  if (!list) throw new Error("no_data");
  return {
    total: list.total ?? 0,
    questions: ((list.questions ?? []) as any[]).map((q) => ({
      number: Number(q.questionFrontendId),
      slug: q.titleSlug,
      title: q.title,
      difficulty: String(q.difficulty ?? "easy").toLowerCase() as "easy" | "medium" | "hard",
      tags: (q.topicTags ?? []).map((t: any) => t.slug),
      isPremium: !!q.paidOnly,
      url: `https://leetcode.com/problems/${q.titleSlug}/`,
      acRate: Number(q.acRate ?? 0),
    })),
  };
}

/**
 * 抓全部題庫（分頁、~3300 題、約 1-2 分鐘）
 * onPage 用來 callback 進度報告
 */
export async function fetchAllLeetcodeProblems(
  onPage?: (current: number, total: number, batch: number) => void,
): Promise<LeetcodeProblem[]> {
  const PAGE = 100;
  const out: LeetcodeProblem[] = [];
  let skip = 0;
  let total = 0;
  while (true) {
    const { total: t, questions } = await fetchPage(skip, PAGE);
    total = t;
    if (questions.length === 0) break;
    out.push(...questions);
    if (onPage) onPage(out.length, total, questions.length);
    skip += questions.length;
    if (skip >= total) break;
    // rate limit 客氣一點、500ms 一頁
    await new Promise((r) => setTimeout(r, 500));
  }
  return out;
}

/** 增量：只抓「最新 N 題」（按 questionFrontendId DESC 排序、給 cron 用） */
export async function fetchLatestLeetcodeProblems(limit = 100): Promise<LeetcodeProblem[]> {
  // 官方 graphql 沒給 sort、但 skip=0 拿 limit 就是按 frontendId 升序的前面
  // 改抓「skip=total-limit、limit=limit」拿最後面（=最新加題）
  const { total } = await fetchPage(0, 1);
  const skip = Math.max(0, total - limit);
  const { questions } = await fetchPage(skip, limit);
  return questions;
}
