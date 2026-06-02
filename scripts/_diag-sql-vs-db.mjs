// Compare every CREATE TABLE in supabase/*.sql against actual DB tables.
// Reports tables defined in SQL but missing in DB (= migration likely not run).
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

// gather CREATE TABLE names from SQL files
const files = readdirSync("supabase").filter((f) => f.endsWith(".sql"));
const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z0-9_]+)["']?/gi;
const declared = new Map(); // table -> [files]
for (const f of files) {
  const sql = readFileSync(`supabase/${f}`, "utf8");
  let m;
  while ((m = re.exec(sql))) {
    const t = m[1].toLowerCase();
    if (!declared.has(t)) declared.set(t, []);
    declared.get(t).push(f);
  }
}

const env = loadEnv();
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await client.connect();
const r = await client.query("select table_name from information_schema.tables where table_schema='public'");
const existing = new Set(r.rows.map((x) => x.table_name));
await client.end();

console.log(`SQL 檔宣告 ${declared.size} 張 table、DB 實際 ${existing.size} 張`);
const missing = [...declared.keys()].filter((t) => !existing.has(t)).sort();
console.log(`\n❌ SQL 有定義、但 DB 沒這張表（migration 可能沒跑）：${missing.length}`);
for (const t of missing) console.log(`  · ${t}  ← ${declared.get(t).join(", ")}`);
