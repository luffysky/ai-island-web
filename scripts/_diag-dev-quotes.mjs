import { readFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync(".env.local", "utf8").split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) { let v = m[2].trim(); if (v.startsWith('"')) v = v.slice(1,-1); acc[m[1]] = v; }
  return acc;
}, {});
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const r = await c.query("SELECT count(*)::int as n FROM dev_quotes");
console.log(`dev_quotes 共 ${r.rows[0].n} 條`);
const sample = await c.query("SELECT content, author FROM dev_quotes LIMIT 3");
console.table(sample.rows);
await c.end();
