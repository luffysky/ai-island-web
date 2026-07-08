// 把 Claude 本人翻好的譯文寫回 content_translations（不打 AI API、零成本）。
// 輸入 JSON: [{ scope, id, field, locale, zh, translated }]
// source_hash 由 zh 算（跟 content-i18n.ts / translate-content-cli.mjs 一致）。
// 用法：node scripts/apply-my-translations.mjs <inJson>
import pg from "pg";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { loadEnv } from "./_lib/ai-crypto.mjs";

const IN = process.argv[2];
if (!IN) { console.error("用法: apply-my-translations.mjs <inJson>"); process.exit(1); }
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex").slice(0, 32);
const items = JSON.parse(readFileSync(IN, "utf8"));
const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
let ok = 0, bad = 0;
for (const it of items) {
  if (!it.scope || !it.id || !it.field || !it.locale || !it.zh || !it.translated) { bad++; continue; }
  try {
    await c.query(
      `insert into public.content_translations (source_type, source_id, field, locale, source_hash, translated, updated_at)
       values ($1,$2,$3,$4,$5,$6, now())
       on conflict (source_type, source_id, field, locale)
       do update set source_hash=excluded.source_hash, translated=excluded.translated, updated_at=now()`,
      [it.scope, it.id, it.field, it.locale, hash(it.zh), it.translated]);
    ok++;
  } catch (e) { bad++; console.warn("✗", it.id, it.field, it.locale, e.message); }
}
console.log(`✅ 寫入 ${ok}、略過/失敗 ${bad}`);
await c.end();
