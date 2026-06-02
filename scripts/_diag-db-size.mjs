import { readFileSync } from "node:fs";
import pg from "pg";
const env={};for(const l of readFileSync(".env.local","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m){let v=m[2].trim();if(/^["'].*["']$/.test(v))v=v.slice(1,-1);env[m[1]]=v;}}
const c=new pg.Client({connectionString:env.SUPABASE_DB_URL});await c.connect();
const tot=await c.query("select pg_size_pretty(pg_database_size(current_database())) as s");
console.log("DB 總大小:",tot.rows[0].s);
const r=await c.query(`select n.nspname as schema, c.relname as tbl, pg_size_pretty(pg_total_relation_size(c.oid)) as sz, pg_total_relation_size(c.oid) as bytes
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','m') and n.nspname in ('public','auth','storage')
order by pg_total_relation_size(c.oid) desc limit 18`);
console.log("\nTop tables:");
for(const x of r.rows)console.log("  "+x.sz.padStart(9)+"  "+x.schema+"."+x.bl);
await c.end();
