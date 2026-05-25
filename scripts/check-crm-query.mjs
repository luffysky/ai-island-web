import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await client.connect();

// 模擬 /admin/crm 直接 query
const r = await client.query(`
  SELECT t.id, t.subject, t.status, t.user_id, t.meta,
         p.username, p.display_name
  FROM public.tickets t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  ORDER BY t.updated_at DESC NULLS LAST
  LIMIT 10;
`);
console.log(`tickets 全列：${r.rows.length}`);
for (const t of r.rows) {
  console.log(`  - ${t.id.slice(0,8)} | ${t.status} | "${t.subject?.slice(0,40)}" | user=${t.username ?? '(line-guest)'} | meta=${JSON.stringify(t.meta).slice(0,100)}`);
}

// FK 約束查
const fkCheck = await client.query(`
  SELECT con.conname, pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
  WHERE cl.relname IN ('tickets', 'ticket_messages')
    AND con.contype = 'f';
`);
console.log("\nFK 約束：");
for (const r of fkCheck.rows) console.log(`  ${r.conname}: ${r.pg_get_constraintdef}`);

await client.end();
