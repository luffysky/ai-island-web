// 一次性 migration 執行腳本
// 用法：node scripts/run-migrations.mjs
// 從 .env.local 讀 SUPABASE_DB_URL、依序執行 supabase/*.sql

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const MIGRATIONS = [
  "user_line_bind_migration.sql",
  "error_logs_meta_migration.sql",
];

// 從 .env.local 讀（不依賴 dotenv pkg）
function loadEnv() {
  const path = ".env.local";
  if (!existsSync(path)) {
    console.error("❌ .env.local 不存在");
    process.exit(1);
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const DB_URL = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const safeHost = (() => {
  try {
    const u = new URL(DB_URL.replace(/^postgres(ql)?:\/\//, "https://"));
    return `${u.hostname}:${u.port}`;
  } catch {
    return "(unknown)";
  }
})();

console.log(`📡 連線 ${safeHost}\n`);

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

let okCount = 0;
let failCount = 0;
for (const file of MIGRATIONS) {
  const fpath = join("supabase", file);
  if (!existsSync(fpath)) {
    console.log(`⏭️  ${file} (檔不存在、跳過)`);
    continue;
  }
  const sql = readFileSync(fpath, "utf8");
  process.stdout.write(`▶️  ${file} ...`);
  try {
    await client.query(sql);
    console.log(" ✅");
    okCount++;
  } catch (e) {
    console.log(` ❌\n   ${e.message?.split("\n")[0]}`);
    failCount++;
  }
}

console.log(`\n📊 完成：${okCount} 成功 / ${failCount} 失敗`);
await client.end();
process.exit(failCount > 0 ? 1 : 0);
