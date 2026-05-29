// 列線上 supabase public table 名單、比對最近功能依賴的表
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

const REQUIRED = [
  // 基礎
  "profiles", "auth.users",
  // 我們最近 commit 用到的表
  "tg_admin_state", "owner_journal", "owner_ideas", "broadcast_log",
  "user_discord_bind", "user_discord_onboarding",
  "app_settings",
  // 已知重點表（老 sql 應該都有）
  "subscriptions", "subscription_orders",
  "lesson_progress", "ai_messages", "ai_models", "ai_api_keys",
  "chapters", "dev_quotes", "error_logs",
  "leetcode_problems", "challenge_submissions",
  "user_ai_memory", "user_daily_goals",
  "pet_quests", "user_ai_action_quota",
  "learning_plans", "mock_interview_sessions",
  "external_resources", "mentorships",
  "user_api_keys_v1",
  "forum_threads", "forum_replies", "forum_boards",
  "checkins", "todos", "notifications",
  "user_line_bind", "user_notes",
];

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

const r = await client.query(`select table_name from information_schema.tables where table_schema='public' order by table_name`);
const existing = new Set(r.rows.map((row) => row.table_name));

console.log(`📊 線上 public schema 共 ${existing.size} 張 table`);
console.log("");
console.log("✅ 存在：");
for (const t of REQUIRED) {
  const bare = t.replace("public.", "").replace("auth.", "");
  if (existing.has(bare)) console.log(`  · ${bare}`);
}
console.log("");
console.log("❌ 缺少 / 沒建：");
const missing = [];
for (const t of REQUIRED) {
  if (t.startsWith("auth.")) continue; // auth schema 不在 public
  if (!existing.has(t)) missing.push(t);
}
if (missing.length === 0) console.log("  (全部都在)");
else for (const t of missing) console.log(`  · ${t}`);

await client.end();
