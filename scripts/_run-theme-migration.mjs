// 一次性：跑 theme_studio_migration.sql + 驗證。用法：node scripts/_run-theme-migration.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

// 讀 .env.local 的 SUPABASE_DB_URL（不依賴 dotenv、照 run-migrations.mjs）
const env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const DB_URL = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;
if (!DB_URL) { console.error("❌ SUPABASE_DB_URL not set"); process.exit(1); }

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

const sql = readFileSync("supabase/theme_studio_migration.sql", "utf8");
console.log("▶️  跑 theme_studio_migration.sql ...");
await client.query(sql);
console.log("✅ migration 完成");

// 驗證
const cols = await client.query(`
  select column_name, data_type from information_schema.columns
  where table_schema='public' and table_name='themes' order by ordinal_position`);
console.log("\n📋 themes 欄位：", cols.rows.map(r => `${r.column_name}:${r.data_type}`).join(", "));

const pcol = await client.query(`
  select 1 from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='active_theme_id'`);
console.log("profiles.active_theme_id 存在：", pcol.rowCount > 0 ? "✅" : "❌");

const rls = await client.query(`select relrowsecurity from pg_class where relname='themes'`);
console.log("themes RLS 啟用：", rls.rows[0]?.relrowsecurity ? "✅" : "❌");

const pol = await client.query(`select policyname from pg_policies where tablename='themes'`);
console.log("themes policies：", pol.rows.map(r => r.policyname).join(", ") || "(none)");

await client.end();
