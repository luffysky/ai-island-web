// 修復哨兵被吃掉的舊譯文：凡是「原文含可保護片段(``` / `inline` / <tag> / URL)」的譯文都可能壞掉，
// 刪掉它們 → 之後 translate-sync-all / cron / 背景翻譯會用「新哨兵 ⟦N⟧」重翻。
// 原文沒有可保護片段的譯文（純文字）不受影響、保留。
// 用法：node scripts/fix-corrupted-translations.mjs           # 只統計（dry）
//       node scripts/fix-corrupted-translations.mjs --delete  # 真的刪
import pg from "pg";
import { loadEnv } from "./_lib/ai-crypto.mjs";

const DO = process.argv.includes("--delete");
const SCOPES = [
  { scope: "chapter", table: "chapters", id: "id", fields: ["title", "subtitle"] },
  { scope: "lesson", table: "lessons", id: "id", fields: ["title", "content"] },
  { scope: "blog", table: "user_blog_articles", id: "id", fields: ["title", "summary", "content"] },
  { scope: "forum", table: "forum_threads", id: "id", fields: ["title", "content"] },
];
// 可保護片段的偵測（跟 protect() 對齊）：反引號 / < HTML tag / http 網址
const PROT = /```|`|<[^>]+>|https?:\/\//;

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

let grand = 0;
for (const S of SCOPES) {
  const { rows } = await c.query(`select ${S.id} as id, ${S.fields.join(", ")} from public.${S.table}`);
  // 收集「該 (id,field) 原文含可保護片段」的清單
  const suspect = []; // {id, field}
  for (const row of rows) {
    for (const f of S.fields) {
      const v = String(row[f] ?? "");
      if (v.trim() && PROT.test(v)) suspect.push({ id: String(row.id), field: f });
    }
  }
  if (suspect.length === 0) { console.log(`▶️  ${S.scope}: 無可疑欄位`); continue; }
  // 算這些欄位目前有幾筆譯文
  let del = 0;
  for (const { id, field } of suspect) {
    if (DO) {
      const r = await c.query(
        `delete from public.content_translations where source_type=$1 and source_id=$2 and field=$3`,
        [S.scope, id, field]);
      del += r.rowCount;
    } else {
      const r = await c.query(
        `select count(*)::int n from public.content_translations where source_type=$1 and source_id=$2 and field=$3`,
        [S.scope, id, field]);
      del += r.rows[0].n;
    }
  }
  grand += del;
  console.log(`▶️  ${S.scope}: 可疑欄位 ${suspect.length} 個 → ${DO ? "已刪" : "將刪"}譯文 ${del} 筆`);
}
console.log(`\n📊 ${DO ? "共刪除" : "預計刪除"} ${grand} 筆待重翻。${DO ? "跑 translate-sync-all / 背景翻譯即會用新哨兵重翻。" : "加 --delete 才會真的刪。"}`);
await c.end();
process.exit(0);
