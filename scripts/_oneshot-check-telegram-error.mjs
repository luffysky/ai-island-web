/** 查最近 5 筆 telegram error 的完整 extra JSON */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const r = await c.query(
  `SELECT occurred_at, LEFT(message, 300) AS message, extra
     FROM error_logs
    WHERE source = 'notify-admin/telegram'
      AND occurred_at >= NOW() - INTERVAL '24 hours'
    ORDER BY occurred_at DESC
    LIMIT 5`
);
console.log(JSON.stringify(r.rows, null, 2));
await c.end();
