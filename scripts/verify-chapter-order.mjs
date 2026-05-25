// 驗 chapters DB 排序：sort_index 跟 id 依序印出來、確認 ch72/73/74 排對位置
import { readFileSync, existsSync } from "node:fs";
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

const env = loadEnv();
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT id, stage, sort_index, title, subtitle
  FROM public.chapters
  ORDER BY COALESCE(sort_index, id::numeric)
`);

for (const r of rows) {
  const sortDisp = r.sort_index !== null ? `s=${r.sort_index}` : `(id)`;
  console.log(`  st${r.stage} Ch${String(r.id).padStart(2,"0")} ${sortDisp.padEnd(8)} ${r.title} | ${r.subtitle ?? ""}`);
}

await client.end();
