// 直接對 Supabase Postgres 跑一個 .sql 檔（DDL / migration）。
// 用法：node scripts/run-sql.mjs supabase/xxx.sql
// 需 .env.local 有 SUPABASE_DB_URL（Supabase direct/pooler 連線字串）。
import fs from "node:fs";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const file = process.argv[2];
if (!file) { console.error("用法：node scripts/run-sql.mjs <path.sql>"); process.exit(1); }
const conn = process.env.SUPABASE_DB_URL;
if (!conn) { console.error("❌ 缺 SUPABASE_DB_URL"); process.exit(1); }

const sql = fs.readFileSync(file, "utf8");
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`▶ 執行 ${file} …`);
  await client.query(sql);
  console.log("✅ 完成");
  // 驗證：embedding 欄位 + match_ai_cache 函式是否存在
  const col = await client.query(`select column_name from information_schema.columns where table_name='ai_response_cache' and column_name='embedding'`);
  const fn = await client.query(`select proname from pg_proc where proname='match_ai_cache'`);
  console.log("驗證 embedding 欄:", col.rowCount ? "✅ 有" : "❌ 無");
  console.log("驗證 match_ai_cache 函式:", fn.rowCount ? "✅ 有" : "❌ 無");
} catch (e) {
  console.error("❌ 失敗：", e.message);
  process.exit(1);
} finally {
  await client.end();
}
