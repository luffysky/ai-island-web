// 清掉「中文→中文」的識別列：locale='zh' 但原文本來就是中文的譯文列（無意義、前台永遠不讀）。
// 保留「外文原文翻成中文」的正當 zh 列（guessLocale(原文)!=zh）。
import pg from "pg";
import { loadEnv } from "./_lib/ai-crypto.mjs";
import { guessLocale } from "./_lib/gtranslate.mjs";

const DO = process.argv.includes("--delete");
const SRC = {
  chapter: { table: "chapters", fields: ["title", "subtitle"] },
  lesson: { table: "lessons", fields: ["title", "content"] },
  blog: { table: "user_blog_articles", fields: ["title", "summary", "content"] },
  forum: { table: "forum_threads", fields: ["title", "content"] },
};
const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const zhRows = (await c.query(`select source_type, source_id, field from content_translations where locale='zh'`)).rows;
const cache = {}; // `${type}:${id}` -> row
async function srcText(type, id, field) {
  const key = `${type}:${id}`;
  if (!(key in cache)) {
    const s = SRC[type];
    cache[key] = s ? (await c.query(`select ${s.fields.join(", ")} from public.${s.table} where id=$1`, [id])).rows[0] ?? null : null;
  }
  return cache[key]?.[field] ?? "";
}
// 官方課程一律中文原著 → 不該有任何 zh 譯文（英文技術標題也不機翻成中文）。
const OFFICIAL = new Set(["chapter", "lesson"]);
let del = 0, keep = 0;
for (const r of zhRows) {
  const zh = String(await srcText(r.source_type, r.source_id, r.field));
  // 刪除條件：①官方課程的任何 zh 列 ②使用者內容中「原文本來就是中文」的識別列
  const shouldDelete = OFFICIAL.has(r.source_type) || guessLocale(zh) === "zh";
  if (shouldDelete) {
    if (DO) await c.query(`delete from content_translations where source_type=$1 and source_id=$2 and field=$3 and locale='zh'`, [r.source_type, r.source_id, r.field]);
    del++;
  } else keep++;
}
console.log(`zh 列共 ${zhRows.length}：${DO ? "已刪" : "將刪"} ${del}（官方課程 zh 譯文 + 識別列）、保留正當外文→中文 ${keep}。${DO ? "" : "加 --delete 才會真的刪。"}`);
await c.end();
process.exit(0);
