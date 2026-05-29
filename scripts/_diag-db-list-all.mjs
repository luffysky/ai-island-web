import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const client = new pg.Client({ connectionString: loadEnv().SUPABASE_DB_URL });
await client.connect();
const r = await client.query(`select table_name from information_schema.tables where table_schema='public' order by table_name`);

// 搜尋包含這些字串的 table（看名稱不一致問題）
const patterns = ["order", "note", "quest", "mentor", "bind", "checkin", "api_key", "subscription"];
for (const p of patterns) {
  const hits = r.rows.filter((row) => row.table_name.toLowerCase().includes(p));
  console.log(`\n=== contains "${p}" ===`);
  for (const h of hits) console.log(`  · ${h.table_name}`);
}

await client.end();
