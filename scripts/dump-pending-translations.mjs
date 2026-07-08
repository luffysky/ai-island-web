// 倒出「還沒翻譯」的中文來源，給 Claude 本人直接翻（不打 AI API、零成本）。
// 用法：node scripts/dump-pending-translations.mjs <scope> <fieldsCsv> <outJson> [limit]
//   node scripts/dump-pending-translations.mjs blog title,summary scratch/pending.json 60
import pg from "pg";
import crypto from "node:crypto";
import { writeFileSync } from "node:fs";
import { loadEnv } from "./_lib/ai-crypto.mjs";

const SCOPE = process.argv[2];
const FIELDS = (process.argv[3] || "").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = process.argv[4];
const LIMIT = Number(process.argv[5]) || 100;
const TABLE = { blog: "user_blog_articles", lesson: "lessons", chapter: "chapters", forum: "forum_threads" }[SCOPE];
const WHERE = SCOPE === "blog" ? "where is_public = true" : "";
if (!TABLE || !FIELDS.length || !OUT) { console.error("用法: dump-pending-translations.mjs <scope> <fieldsCsv> <outJson> [limit]"); process.exit(1); }

const hash = (t) => crypto.createHash("sha256").update(t).digest("hex").slice(0, 32);
const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const { rows } = await c.query(`select id, ${FIELDS.join(", ")} from public.${TABLE} ${WHERE} order by updated_at desc nulls last limit 400`);
const { rows: ex } = await c.query(`select source_id, field, locale, source_hash from public.content_translations where source_type=$1`, [SCOPE]);
const seen = new Map(ex.map((r) => [`${r.source_id}|${r.field}|${r.locale}`, r.source_hash]));

const out = [];
for (const row of rows) {
  for (const f of FIELDS) {
    const zh = String(row[f] ?? "");
    if (!zh.trim()) continue;
    const h = hash(zh);
    const need = ["en", "ja", "ko"].filter((loc) => seen.get(`${row.id}|${f}|${loc}`) !== h);
    if (need.length) out.push({ id: String(row.id), field: f, zh, need });
    if (out.length >= LIMIT) break;
  }
  if (out.length >= LIMIT) break;
}
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`倒出 ${out.length} 個待翻中文欄位 → ${OUT}（每個需 ${out.reduce((s, o) => s + o.need.length, 0)} 語）`);
await c.end();
