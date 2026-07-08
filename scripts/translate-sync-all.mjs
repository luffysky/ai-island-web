// 全站內容「偵測改動→自動翻譯」同步器（零成本、免費 Google）。
// 掃所有內容 scope，只翻「還沒翻」或「中文改過(hash 不符)」的欄位 → 寫進 content_translations。
// 中文一改、hash 就變、下次跑就會重翻該欄；沒動的完全跳過。可手動跑、也可排程（cron）。
// 用法：
//   node scripts/translate-sync-all.mjs            # 掃全部、每 scope 上限 500 欄位×語言
//   node scripts/translate-sync-all.mjs 100        # 每 scope 上限 100（cron 小步慢跑用）
import pg from "pg";
import crypto from "node:crypto";
import { loadEnv } from "./_lib/ai-crypto.mjs";
import { translateText, TARGETS, guessLocale } from "./_lib/gtranslate.mjs";

const PER_SCOPE = Number(process.argv[2]) || 500;
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex").slice(0, 32);

// 要同步的內容來源（scope → 表 + 欄位 + 篩選）
const SCOPES = [
  { scope: "chapter", table: "chapters", fields: ["title", "subtitle"], where: "status = 'published'" },
  { scope: "lesson", table: "lessons", fields: ["title", "content"], where: "" },
  { scope: "blog", table: "user_blog_articles", fields: ["title", "summary", "content"], where: "is_public = true" },
  { scope: "forum", table: "forum_threads", fields: ["title", "content"], where: "" },
];

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

let grandNew = 0, grandChanged = 0;
for (const S of SCOPES) {
  const { rows } = await c.query(`select id, ${S.fields.join(", ")} from public.${S.table} ${S.where ? "where " + S.where : ""}`);
  const { rows: ex } = await c.query(`select source_id, field, locale, source_hash from public.content_translations where source_type=$1`, [S.scope]);
  const seen = new Map(ex.map((r) => [`${r.source_id}|${r.field}|${r.locale}`, r.source_hash]));

  let translated = 0, changed = 0, budget = PER_SCOPE;
  // 官方課程(chapter/lesson)不產生 zh 譯文；使用者內容(blog/forum)才翻進中文。
  const scopeTargets = ["blog", "forum"].includes(S.scope) ? TARGETS : TARGETS.filter((t) => t.locale !== "zh");
  outer:
  for (const row of rows) {
    const id = String(row.id);
    for (const field of S.fields) {
      const zh = String(row[field] ?? "");
      if (!zh.trim()) continue;
      const h = hash(zh);
      const srcLoc = guessLocale(zh);          // 原文語言（任意語言互譯：翻進其他語言、含中文）
      for (const { locale, tl } of scopeTargets) {
        if (budget <= 0) break outer;
        if (locale === srcLoc) continue;        // 目標＝原文語言 → 不用翻
        const prev = seen.get(`${id}|${field}|${locale}`);
        if (prev === h) continue;              // 沒動 → 跳過
        if (prev && prev !== h) changed++;      // 中文改過 → 重翻
        try {
          const out = await translateText(zh, tl, { icu: false });
          if (!out || !out.trim()) continue;
          await c.query(
            `insert into public.content_translations (source_type, source_id, field, locale, source_hash, translated, updated_at)
             values ($1,$2,$3,$4,$5,$6, now())
             on conflict (source_type, source_id, field, locale)
             do update set source_hash=excluded.source_hash, translated=excluded.translated, updated_at=now()`,
            [S.scope, id, field, locale, h, out]);
          translated++; budget--;
        } catch (e) { console.warn(`  ✗ ${S.scope}/${id}/${field}/${locale}: ${e.message}`); }
      }
    }
  }
  grandNew += translated; grandChanged += changed;
  console.log(`▶️  ${S.scope}: 翻 ${translated}（其中中文改過重翻 ${changed}）${budget <= 0 ? " …達本次上限、還有剩" : " ✓ 已同步完"}`);
}
console.log(`\n📊 本次共翻 ${grandNew} 欄位×語言（含重翻改動 ${grandChanged}）。中文沒動的全跳過。`);
await c.end();
process.exit(0);
