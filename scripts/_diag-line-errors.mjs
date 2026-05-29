import pg from "pg";
import { loadEnv } from "./_lib/ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const r = await c.query(`
  SELECT id, source, level, message, occurred_at, extra
    FROM error_logs
   WHERE occurred_at > NOW() - INTERVAL '24 hours'
     AND (source LIKE '%line%' OR message LIKE '%AI%' OR message ILIKE '%line%')
   ORDER BY occurred_at DESC
   LIMIT 30
`);
console.log(`找到 ${r.rowCount} 條 24h 內 line/AI 相關錯誤：\n`);
for (const row of r.rows) {
  console.log(`[${row.occurred_at.toISOString()}] ${row.source} / ${row.level}`);
  console.log(`  message: ${row.message?.slice(0, 200)}`);
  if (row.extra) {
    const extraStr = JSON.stringify(row.extra).slice(0, 300);
    console.log(`  extra: ${extraStr}`);
  }
  console.log();
}

await c.end();
