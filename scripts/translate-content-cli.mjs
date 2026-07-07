/**
 * 獨立內容翻譯觸發器（CLI 版）：把中文內容翻成 en/ja/ko 存進 content_translations，
 * 前台 localize* 就能顯示譯文。翻一次不重翻（比對 source_hash）、可安全重跑。
 *
 * 憑證用系統 AI key（走 scripts/_lib/ai-crypto.mjs 解密，跟其他生成器一致）。
 * 與 src/lib/content-i18n.ts 的 contentHash / TRANSLATE_FIELDS / content_translations 對齊。
 *
 * 用法：
 *   node scripts/translate-content-cli.mjs chapter          # 翻章節 metas（預設，便宜）
 *   node scripts/translate-content-cli.mjs forum 200         # 翻論壇主題，最多 200 個欄位
 *   node scripts/translate-content-cli.mjs blog 300
 *   node scripts/translate-content-cli.mjs lesson 500        # ⚠️ lessons 很多，分批多跑幾次
 * 第二個參數 = 本次最多實際翻幾個「欄位×語言」（控 AI 花費），預設依 scope。
 */
import crypto from "node:crypto";
import pg from "pg";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";

const SCOPE = process.argv[2] || "chapter";
const LIMIT = Number(process.argv[3]) || (SCOPE === "chapter" ? 400 : SCOPE === "lesson" ? 600 : 300);

// 與 content-i18n.ts 對齊
const FIELDS = {
  blog: { table: "user_blog_articles", id: "id", fields: ["title", "summary", "content"], where: "is_public" },
  lesson: { table: "lessons", id: "id", fields: ["title", "content"] },
  chapter: { table: "chapters", id: "id", fields: ["title", "subtitle"] },
  forum: { table: "forum_threads", id: "id", fields: ["title", "content"] },
};
const TARGETS = [
  { locale: "en", label: "English" },
  { locale: "ja", label: "Japanese" },
  { locale: "ko", label: "Korean" },
];
const cfg = FIELDS[SCOPE];
if (!cfg) { console.error(`未知 scope: ${SCOPE}（可用 chapter/lesson/forum/blog）`); process.exit(1); }

const contentHash = (t) => crypto.createHash("sha256").update(t).digest("hex").slice(0, 32);

const sysPrompt = (label) => `You are a professional translator for a programming-learning platform.
Translate the given Traditional Chinese text into natural, fluent ${label} suitable for beginners.
CRITICAL rules:
- Preserve ALL HTML tags, markdown syntax, and code blocks EXACTLY as-is.
- Do NOT translate anything inside <code>, <pre>, or triple-backtick fences, and do NOT translate variable/function names, file names, or code.
- Keep the same structure, headings, and line breaks.
- Keep programming terms in ${label} conventional form (e.g., keep "variable", "function", "for loop" style).
Return ONLY the translated text — no preamble, no explanations, no wrapping.`;

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const model = await pickModelName(c, "anthropic");
console.log(`▶️  翻譯 scope=${SCOPE} · model=${model} · 目標 en/ja/ko · 本次上限 ${LIMIT} 欄位×語言`);

async function aiTranslate(zh, label) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 4096, system: sysPrompt(label), messages: [{ role: "user", content: zh }] }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim() || null;
}

// 撈來源（最多 300 筆、依 updated_at）
let sql = `select ${[cfg.id, ...cfg.fields].join(", ")} from public.${cfg.table}`;
if (cfg.where) sql += ` where ${cfg.where} = true`;
sql += ` order by updated_at desc nulls last limit 300`;
const { rows } = await c.query(sql);

// 既有譯文（避免重翻）
const { rows: existing } = await c.query(
  `select source_id, field, locale, source_hash from public.content_translations where source_type=$1`, [SCOPE]);
const seen = new Map(existing.map((r) => [`${r.source_id}|${r.field}|${r.locale}`, r.source_hash]));

let translated = 0, skipped = 0, failed = 0, budget = LIMIT;
outer:
for (const row of rows) {
  const id = String(row[cfg.id]);
  for (const field of cfg.fields) {
    const zh = String(row[field] ?? "");
    if (!zh.trim()) continue;
    const hash = contentHash(zh);
    for (const { locale, label } of TARGETS) {
      if (budget <= 0) break outer;
      if (seen.get(`${id}|${field}|${locale}`) === hash) { skipped++; continue; }
      try {
        const out = await aiTranslate(zh, label);
        if (!out) { failed++; continue; }
        await c.query(
          `insert into public.content_translations (source_type, source_id, field, locale, source_hash, translated, updated_at)
           values ($1,$2,$3,$4,$5,$6, now())
           on conflict (source_type, source_id, field, locale)
           do update set source_hash=excluded.source_hash, translated=excluded.translated, updated_at=now()`,
          [SCOPE, id, field, locale, hash, out]);
        translated++; budget--;
        if (translated % 15 === 0) console.log(`  …已翻 ${translated}（剩額度 ${budget}）`);
      } catch (e) { failed++; console.warn(`  ✗ ${id}/${field}/${locale}: ${e.message}`); }
    }
  }
}
console.log(`✓ 完成：翻了 ${translated}、跳過(已翻) ${skipped}、失敗 ${failed}`);
await c.end();
