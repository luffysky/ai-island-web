/**
 * 一次性抓全部 LeetCode 題庫進 leetcode_problems 表
 *
 * 跑法：node scripts/_oneshot-leetcode-scrape.mjs
 *
 * 抓策略：
 *  - 直打 LeetCode GraphQL（不需登入）
 *  - 分頁 100 / page、約 33 頁、共 ~3300 題
 *  - 每頁間 500ms delay（client friendly、不被 LeetCode rate limit）
 *  - UPSERT by slug（重複跑只更新、不重複 insert）
 *
 * 之後 cron 每天跑 /api/cron/leetcode-sync-daily 抓增量。
 */
import pg from "pg";
import { readFileSync } from "node:fs";

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

// load .env.local
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const before = await c.query(`SELECT COUNT(*) AS n FROM leetcode_problems`);
console.log(`📚 目前 leetcode_problems 表：${before.rows[0].n} 題`);

async function fetchPage(skip, limit) {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; ai-island/1.0)",
      "Referer": "https://leetcode.com/problemset/all/",
    },
    body: JSON.stringify({
      query: PROBLEMSET_QUERY,
      variables: { categorySlug: "", limit, skip, filters: {} },
    }),
  });
  if (!res.ok) throw new Error(`http_${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "graphql_error");
  return json.data.problemsetQuestionList;
}

const PAGE = 100;
let skip = 0;
let total = 0;
let inserted = 0;
let updated = 0;
let pageNum = 0;

while (true) {
  pageNum++;
  console.log(`\n📄 第 ${pageNum} 頁 (skip=${skip})...`);
  let list;
  try {
    list = await fetchPage(skip, PAGE);
  } catch (e) {
    console.warn(`  ⚠️ 抓頁失敗：${e.message}、跳過`);
    skip += PAGE;
    if (skip > 5000) break;
    continue;
  }
  total = list.total;
  const qs = list.questions ?? [];
  if (qs.length === 0) break;

  for (const q of qs) {
    const number = Number(q.questionFrontendId);
    const slug = q.titleSlug;
    const title = q.title;
    const difficulty = String(q.difficulty ?? "easy").toLowerCase();
    if (!["easy", "medium", "hard"].includes(difficulty)) continue;
    const tags = (q.topicTags ?? []).map((t) => t.slug);
    const isPremium = !!q.paidOnly;
    const url = `https://leetcode.com/problems/${slug}/`;

    try {
      const r = await c.query(`
        INSERT INTO leetcode_problems (number, slug, title, difficulty, tags, is_premium, url, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (slug) DO UPDATE SET
          number = EXCLUDED.number,
          title = EXCLUDED.title,
          difficulty = EXCLUDED.difficulty,
          tags = EXCLUDED.tags,
          is_premium = EXCLUDED.is_premium,
          url = EXCLUDED.url,
          active = true
        RETURNING (xmax = 0) AS inserted
      `, [number, slug, title, difficulty, tags, isPremium, url]);
      if (r.rows[0]?.inserted) inserted++;
      else updated++;
    } catch (e) {
      console.warn(`  ⚠️ ${slug} upsert 失敗：${e.message}`);
    }
  }
  console.log(`  ✓ ${qs.length} 題（總共處理 ${inserted + updated}/${total}）`);
  skip += qs.length;
  if (skip >= total) break;

  // rate limit 客氣 500ms
  await new Promise((r) => setTimeout(r, 500));
}

const after = await c.query(`SELECT COUNT(*) AS n FROM leetcode_problems`);
const byDiff = await c.query(`
  SELECT difficulty, COUNT(*) AS n
    FROM leetcode_problems
   WHERE active = true
   GROUP BY difficulty
`);
const premiumCount = await c.query(`SELECT COUNT(*) AS n FROM leetcode_problems WHERE is_premium = true`);

console.log(`\n✨ 完成 — leetcode_problems 表：${after.rows[0].n} 題`);
console.log(`  - 新增：${inserted}`);
console.log(`  - 更新：${updated}`);
console.log(`  - LeetCode 總題數（API 回報）：${total}`);
console.log(`  - 難度分布：`);
for (const r of byDiff.rows) console.log(`      ${r.difficulty}: ${r.n}`);
console.log(`  - Premium 題：${premiumCount.rows[0].n}`);

await c.end();
