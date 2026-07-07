/**
 * 創作者部落格種子：給正經創作者（蘇晚/林之遠/何默/江見）各開部落格 + 幾篇「真人自己寫」的文章。
 * - 承接 seed-creator-works.mjs 建的創作者；沒有就提醒先跑那支。
 * - user_blog_settings（開通 + 自訂 slug/標題/簡介）+ user_blog_articles（is_public、published_at 散在過去數週）。
 * - 內容手寫、第一人稱、有生活感，不是教科書。冪等：先依 user+slug 刪再重鋪。
 * Usage: node scripts/seed-creator-blog.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]));
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
const P = (...paras) => paras.map((t) => `<p>${t}</p>`).join("");

// 創作者的部落格設定 + 文章
const BLOGS = [
  {
    username: "suwan", blogSlug: "suwan", blogTitle: "蘇晚的日子", blogDesc: "寫日常與微光。",
    articles: [
      {
        slug: "morning-three-lines", title: "為什麼我開始寫每天三行的晨間筆記", category: "生活", tags: ["習慣", "書寫"], views: 214, days: 12,
        summary: "不是為了變厲害，是為了在忙起來之前，先跟自己說一句話。",
        content: P(
          "我不是很有紀律的人，那種「每天寫一千字」的計畫我試過三次都失敗。後來我把門檻降到最低：每天早上只寫三行。",
          "第一行寫昨天一件小小的好事，第二行寫今天最想做完的一件事，第三行隨便——一句抱怨、一個念頭都行。",
          "神奇的是，因為只有三行，我幾乎不會不想寫。而那三行像一個小小的儀式，讓我在被訊息和待辦淹沒之前，先安靜地跟自己說一句話。",
          "如果你也一直開始不了什麼習慣，也許不是你不夠自律，是門檻設太高了。把它降到「低到不好意思不做」，先讓它發生，再談變好。",
        ),
      },
    ],
  },
  {
    username: "zhiyuan", blogSlug: "zhiyuan", blogTitle: "林之遠的技術隨筆", blogDesc: "把難的東西講成人話。",
    articles: [
      {
        slug: "error-as-treasure", title: "我把『看不懂的錯誤訊息』當成尋寶", category: "技術隨筆", tags: ["除錯", "心法"], views: 356, days: 9,
        summary: "紅字不是在罵你，它幾乎已經把答案寫在最後一行了。",
        content: P(
          "剛學程式時我最怕紅字，一出現就腦袋空白亂改。後來一位前輩跟我說：「錯誤訊息是全世界最想幫你的東西，你卻不讀它。」我才開始認真看。",
          "我的習慣是：先看<b>最後一行</b>（錯誤類型 + 說明），再看倒數幾行的檔名跟行號，直接跳過去。八成問題當場就定位了。",
          "把它當尋寶之後，心態就變了——不是「完蛋又出錯」，而是「喔它在跟我說哪裡不對」。看得懂錯誤的人，debug 速度會跟看不懂的人差好幾倍。",
          "所以如果你也還在怕紅字：慢下來，把最後一行讀完再動手。那一行，通常就是地圖上的 X。",
        ),
      },
    ],
  },
  {
    username: "hemo.ink", blogSlug: "hemo", blogTitle: "何默的字", blogDesc: "詩與短句，對世界小小的抵抗。",
    articles: [
      {
        slug: "for-the-late-nights", title: "寫給那些覺得自己不夠好的深夜", category: "隨筆", tags: ["文字", "陪伴"], views: 401, days: 6,
        summary: "你只是還在路上，不是走錯路。",
        content: P(
          "深夜是最容易否定自己的時段。白天的忙碌散去，剩下的安靜會把「我是不是不夠好」放得很大聲。",
          "我想說的其實很簡單：你現在覺得難的那些，不是因為你不行，是因為它對你還很新。新的東西本來就笨拙，笨拙不是缺陷，是還沒熟。",
          "把「我做不到」偷偷換成「我還沒做到」，就多了一個時間的縫，光會從那裡進來。",
          "晚安。明天的你，會比今天多會一點點。這樣就夠了。",
        ),
      },
    ],
  },
  {
    username: "riverseen", blogSlug: "riverseen", blogTitle: "江見的點子本", blogDesc: "把生活的小麻煩，變成值得做的小東西。",
    articles: [
      {
        slug: "weekend-tiny-tool", title: "我如何用一個週末，做出解決自己麻煩的小工具", category: "產品", tags: ["點子", "動手做"], views: 288, days: 3,
        summary: "最好做的產品，是你自己每天都會用的那個。",
        content: P(
          "我一直被一件小事煩：常常想到要做什麼，三秒後就忘了。市面上的待辦 App 步驟太多，我懶得記。",
          "那個週末我決定自己做一個：一顆按鈕、一個時間、一則通知——「正要忘記」的當下按一下，它就在明天早上提醒我。沒有分類、沒有標籤，刻意做到最陽春。",
          "我學到最重要的一件事是：<b>先做最小可用版，再談漂亮</b>。第一版又醜又簡單，但我當天就用上了，而「有在用」比「做得完美」重要一百倍。",
          "如果你也想動手做點什麼，別找很厲害的題目——找一個你自己每天都會遇到的小麻煩，那就是最好的起點。",
        ),
      },
    ],
  },
];

// 找創作者 id
async function uid(username) {
  const { rows } = await c.query("select id from public.profiles where username=$1", [username]);
  return rows[0]?.id ?? null;
}

let blogs = 0, arts = 0;
for (const b of BLOGS) {
  const id = await uid(b.username);
  if (!id) { console.warn(`  ⚠ 找不到創作者 @${b.username}，先跑 node scripts/seed-creator-works.mjs`); continue; }

  // 開通部落格
  await c.query(
    `insert into public.user_blog_settings (user_id, blog_slug, blog_title, blog_desc, is_enabled)
     values ($1,$2,$3,$4,true)
     on conflict (user_id) do update set blog_slug=excluded.blog_slug, blog_title=excluded.blog_title, blog_desc=excluded.blog_desc, is_enabled=true`,
    [id, b.blogSlug, b.blogTitle, b.blogDesc],
  );
  blogs++;

  for (const a of b.articles) {
    // 冪等：先刪同 slug
    await c.query("delete from public.user_blog_articles where user_id=$1 and slug=$2", [id, a.slug]);
    await c.query(
      `insert into public.user_blog_articles (user_id, title, slug, summary, content, tags, category, is_public, view_count, published_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$9,$9)`,
      [id, a.title, a.slug, a.summary, a.content, a.tags ?? [], a.category ?? null, a.views ?? 0, daysAgo(a.days)],
    );
    arts++;
  }
  console.log(`  ✓ ${b.blogTitle}（@${b.username}）→ ${b.articles.length} 篇`);
}

const { rows: cnt } = await c.query("select count(*)::int n from public.user_blog_articles where is_public");
console.log(`✓ 創作者部落格種子完成：${blogs} 個部落格 / ${arts} 篇文章`);
console.log(`  現況 → 公開文章共 ${cnt[0].n} 篇`);
await c.end();
