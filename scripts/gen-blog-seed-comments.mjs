/**
 * 部落格種子留言（AI 生成、炒熱氣氛）：給留言太少的公開文章補上 2~4 則「其他學習者」留言，
 * 偶爾帶 emoji、偶爾有作者本人回覆。冪等（已達門檻或同名同內容就跳過）、可 --limit 分批。
 *
 * ⚠️ 會呼叫 AI、花錢。先 --dry / 小 --limit 試。
 * 用法：
 *   node scripts/gen-blog-seed-comments.mjs --limit 5 --dry
 *   node scripts/gen-blog-seed-comments.mjs --limit 60            # 補 60 篇
 *   node scripts/gen-blog-seed-comments.mjs --min 2 --limit 100   # 留言<2 的都補
 * 需 .env.local：SUPABASE_DB_URL、SUPABASE_SERVICE_ROLE_KEY、AI_KEY_SECRET
 */
import pg from "pg";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";
import { logCliUsage } from "./_lib/log-cli-usage.mjs";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); if (i === -1) return d; const v = args[i + 1]; return v && !v.startsWith("--") ? v : true; };
const LIMIT = Number(arg("limit", 20));
const MIN = Number(arg("min", 2));       // 留言數 < MIN 的文章才補
const DRY = !!arg("dry", false);
const MODEL_ARG = arg("model", "claude-haiku-4-5-20251001");

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const model = (MODEL_ARG === "auto" || MODEL_ARG === true) ? await pickModelName(c, "anthropic") : String(MODEL_ARG);

// 隨機錯開時間、看起來像陸續留的（固定基準避免重跑亂跳）
const BASE = Date.parse("2026-07-08T09:00:00+08:00");
let tick = 0;
const nextTs = () => new Date(BASE + (tick++) * 41 * 60000).toISOString();

const SYS = `你在替一篇部落格文章生成「其他讀者的留言」，讓文章有社群互動感。
規則：
- 留言者是「一般學習者/讀者」，用真實、口語、不做作的中文短句（1~2 句）。
- 語氣多元：有人稱讚、有人分享自己的經驗、有人小發問、有人被戳中。不要每則都一樣。
- 名字用像網路暱稱的假名（例：阿賢、Nini、轉職中的Leo、夜貓子K、小魚），不要重複。
- 約一半的留言可帶 1 個貼合情緒的 emoji（🙏😂🥹💪👍🤔😭✨ 之類），別每則都放、別放一堆。
- 不要提到「AI 生成」、不要出戲、不要空泛（如「好文推」這種沒內容的）。
只輸出 JSON 陣列，每個元素：{"name":"暱稱","content":"留言","reply":"（可選）作者本人的一句簡短回覆，沒有就省略"}。
最多一則帶 reply。只輸出 JSON。`;

async function genComments(article) {
  const user = `文章標題：「${article.title}」\n摘要：${article.summary || "（無）"}\n作者：${article.author}\n請生成 ${2 + Math.floor(Math.random() * 3)} 則讀者留言（JSON 陣列）。`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1200, system: SYS, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  await logCliUsage(c, { model, inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens });
  const raw = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const s = raw.indexOf("["), e = raw.lastIndexOf("]");
  if (s < 0 || e < 0) throw new Error("解析失敗");
  return JSON.parse(raw.slice(s, e + 1)).filter((x) => x && x.name && x.content);
}

async function dup(articleId, name, content) {
  const { rows } = await c.query("select 1 from public.blog_comments where article_id=$1 and author_name=$2 and content=$3 limit 1", [articleId, name, content]);
  return rows.length > 0;
}

// 抓「公開、留言數 < MIN」的文章（含作者顯示名）
const { rows: articles } = await c.query(
  `select a.id, a.user_id, a.title, a.summary, coalesce(p.display_name,'作者') as author,
          (select count(*) from public.blog_comments bc where bc.article_id=a.id) as ccount
   from public.user_blog_articles a
   left join public.profiles p on p.id=a.user_id
   where a.is_public=true
   order by a.published_at desc nulls last`
);
const todo = articles.filter((a) => Number(a.ccount) < MIN).slice(0, LIMIT);
console.log(`🤖 model=${model} · 公開文章 ${articles.length}、留言<${MIN} 的 ${articles.filter((a) => Number(a.ccount) < MIN).length}、這輪處理 ${todo.length} · dry=${DRY}\n`);

let added = 0, done = 0;
for (const a of todo) {
  process.stdout.write(`▶️  ${a.title.slice(0, 28)} …`);
  try {
    const list = await genComments(a);
    if (DRY) { console.log(` (dry) ${list.map((x) => x.name).join("、")}`); done++; continue; }
    for (const cm of list) {
      if (await dup(a.id, cm.name, cm.content)) continue;
      const { rows: ins } = await c.query(
        `insert into public.blog_comments (article_id, parent_id, user_id, author_name, author_email, author_avatar, content, is_approved, created_at)
         values ($1,null,null,$2,null,null,$3,true,$4) returning id`,
        [a.id, String(cm.name).slice(0, 40), String(cm.content).slice(0, 1000), nextTs()]
      );
      added++;
      // 作者本人回覆（用文章作者 user_id + display_name）
      if (cm.reply && String(cm.reply).trim()) {
        await c.query(
          `insert into public.blog_comments (article_id, parent_id, user_id, author_name, author_email, author_avatar, content, is_approved, created_at)
           values ($1,$2,$3,$4,null,null,$5,true,$6)`,
          [a.id, ins[0].id, a.user_id, String(a.author).slice(0, 40), String(cm.reply).slice(0, 1000), nextTs()]
        );
        added++;
      }
    }
    done++; console.log(` ✅ +${list.length}`);
  } catch (e) { console.log(` ❌ ${e.message}`); }
}
console.log(`\n✓ 處理 ${done} 篇、新增 ${added} 則留言。再跑一次可續補下一批。`);
await c.end();
