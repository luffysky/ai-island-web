// 把 scripts/_data/dictionary-seed*.json 灌進 public.dictionary_terms（依 slug upsert、冪等可重跑）。
// 內容是「手寫、零 API」的，之後每批新增 dictionary-seed-N.json 再重跑即可累積到 5000。
// 用法：node scripts/import-dictionary.mjs
import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]));
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const DIR = "scripts/_data";
const files = readdirSync(DIR).filter((f) => /^dictionary-seed.*\.json$/.test(f)).sort();
let rows = [];
for (const f of files) {
  const arr = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  if (Array.isArray(arr)) rows.push(...arr);
  console.log(`  讀 ${f}：${Array.isArray(arr) ? arr.length : 0} 條`);
}

// 去重（同 slug 後蓋前）
const bySlug = new Map();
for (const r of rows) { if (r && r.slug) bySlug.set(r.slug, r); }
const list = [...bySlug.values()];
console.log(`共 ${list.length} 條（去重後）`);

let ok = 0, err = 0;
for (const r of list) {
  try {
    await c.query(
      `insert into public.dictionary_terms
         (slug, domain, term, aliases, zh_name, category, langs, plain, analogy, example, related, difficulty)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (slug) do update set
         domain=excluded.domain, term=excluded.term, aliases=excluded.aliases, zh_name=excluded.zh_name,
         category=excluded.category, langs=excluded.langs, plain=excluded.plain, analogy=excluded.analogy,
         example=excluded.example, related=excluded.related, difficulty=excluded.difficulty, updated_at=now()`,
      [
        r.slug, r.domain || "programming", r.term, r.aliases || [], r.zh_name || null,
        r.category || "concept", r.langs || [], r.plain, r.analogy || null, r.example || null,
        r.related || [], Number(r.difficulty) || 1,
      ]
    );
    ok++;
  } catch (e) { err++; console.log(`  ❌ ${r.slug}: ${e.message}`); }
}
const { rows: cnt } = await c.query("select count(*)::int n from public.dictionary_terms");
console.log(`\n✅ upsert ${ok}、失敗 ${err}；辭典現有 ${cnt[0].n} 條`);
await c.end();
