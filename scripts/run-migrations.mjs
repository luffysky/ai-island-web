// 一次性 migration 執行腳本
// 用法：node scripts/run-migrations.mjs
// 從 .env.local 讀 SUPABASE_DB_URL、依序執行 supabase/*.sql

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// 今天 (2026-05-25) 新加 / 改的所有 migration、按 commit 時間順序
// 全部冪等 (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE)、重跑安全
const MIGRATIONS = [
  // 早上 03–05
  "env_change_requests_migration.sql",
  "pets_ai_customization_migration.sql",
  "notify_optout_migration.sql",
  "notify_optout_default_true_migration.sql",
  "notify_optout_default_false_migration.sql",
  "quiz_elo_delta_migration.sql",
  "user_line_bind_migration.sql",          // ← LINE 綁定流程依賴 (line_user_id 欄位)
  "media_assets_migration.sql",
  // 早上 06–08
  "canned_replies_migration.sql",          // ← CRM 罐頭訊息
  "semantic_search_migration.sql",
  "tickets_meta_migration.sql",            // ← LINE ticket source 欄位
  "notification_settings_migration.sql",
  "app_settings_extend_migration.sql",
  "error_log_migration.sql",
  "error_logs_meta_migration.sql",         // ← webhook sig debug 用
  // 上午 08–11
  "forum_like_count_migration.sql",
  "learning_state_view_migration.sql",
  "rls_with_check_migration.sql",
  "lesson_progress_check_fix_migration.sql",
  "nami_challenges_migration.sql",
  // 下午 13–14
  "chapter_sort_index_migration.sql",
  "ai_usage_models_migration.sql",         // ← LINE bot 抓 model 對應依賴
  "profile_owner_role_migration.sql",
  "marketing_migration.sql",               // ← affiliate / competitor / ads CRUD 依賴
  "lottie_settings_migration.sql",
  "profile_is_owner_migration.sql",
  // 2026-05-27 — AI embedding (學員 LINE AI 語意搜尋)
  "ai_embeddings_migration.sql",
  // 2026-05-29 — dev_quotes UNIQUE constraint (oneshot 寫入用 ON CONFLICT DO NOTHING)
  "dev_quotes_unique_constraint.sql",
  // 2026-05-29 — 跨 channel AI 記憶（Web / LINE / TG / Discord 共用）
  "user_ai_memory_migration.sql",
  // 2026-05-29 — 學員每日目標表 (/goal LINE 命令)
  "user_daily_goals_migration.sql",
  // 2026-05-29 — admin Launchpad kanban (功能總覽 / 待辦 / 許願池)
  "admin_kanban_migration.sql",
  // 2026-05-29 — 學員外部資源庫（/me/resources）
  "external_resources_migration.sql",
  // 2026-05-29 — external_resources 加 chapter_id（章節相關資源）
  "external_resources_chapter_link_migration.sql",
  // 2026-05-29 — 週賽 Code Challenge
  "weekly_challenge_migration.sql",
  // 2026-05-29 — 學員配對 mentor / peer
  "mentorships_migration.sql",
  // 2026-05-29 — 對外 AI API key (api_keys_v1)
  "user_api_keys_v1_migration.sql",
  // 2026-05-29 — 模擬面試記錄保存
  "mock_interview_sessions_migration.sql",
  // 2026-05-29 — 寵物每日任務（daily_quest 欄）
  "pet_quests_migration.sql",
  // 2026-05-29 — 每 user 月 AI token cap (成本壓縮 C)
  "per_user_ai_cap_migration.sql",
  // 2026-05-29 — AI action quota（tutor 10 串、其他 3 次 / 月）
  "ai_action_quota_migration.sql",
  // 2026-05-29 — TG bot 11 條進階指令（silence / focus / journal / idea / broadcast）
  "tg_advanced_migration.sql",
  // 2026-05-29 — 4 隻寵物 Lottie URL slot（林董：emoji 換成 Lottie）
  "pet_lottie_settings_migration.sql",
  // 2026-05-29 — Discord OAuth 綁定 + onboarding 進度（DC#4/5/7/1 基礎）
  "discord_binding_migration.sql",
  // 2026-05-29 — 新手友善 onboarding state（A: tour、B: wizard、C: chapters）
  "onboarding_migration.sql",
  // 2026-05-29 — Stripe 訂閱付款（webhook + customer + subscription mapping）
  "stripe_migration.sql",
  // 2026-06-18 — 學習進度細節跨裝置同步（reading_position current+furthest / lesson_engagement 捲動深度·停留·掌握）
  "learning_progress_detail_migration.sql",
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
