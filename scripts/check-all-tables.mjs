/**
 * 確認所有預期的表是否存在、列出缺的
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 預期應該存在的表 (從 codebase 用到的所有表 + migration 建的)
const EXPECTED = [
  // core
  "profiles", "audit_logs", "error_logs", "rate_limits", "app_settings",
  // learning
  "chapters", "chapter_versions", "lesson_progress", "daily_checkins",
  "chapter_quizzes", "quiz_attempts", "daily_quiz_attempts", "xp_events",
  // gamification
  "pets", "pet_messages", "daily_quests", "achievements", "user_achievements",
  // commerce
  "orders", "subscriptions", "chapter_purchases", "coin_transactions",
  // forum / blog / social
  "forum_boards", "forum_threads", "forum_replies",
  "blog_posts", "blog_comments", "blog_reactions", "blog_comment_likes",
  "blog_series", "blog_subscribers", "user_blog_settings", "user_blog_articles",
  "comment_likes",
  // ai
  "ai_models", "ai_api_keys", "ai_conversations", "ai_messages",
  "ai_daily_quota", "ai_usage_daily", "ai_response_cache",
  "ai_moderation_flags", "ai_moderation_keywords", "user_api_keys",
  // line
  "line_bind_codes",
  // crm
  "tickets", "ticket_messages", "canned_replies",
  // notifications / email
  "notifications", "notification_settings", "email_subscriptions",
  "email_campaigns", "email_recipients", "broadcasts",
  // admin
  "ab_experiments", "ab_assignments", "ab_events",
  "admin_events", "admin_impersonations", "admin_line_prefs",
  "analytics_events", "analytics_page_views", "analytics_sessions",
  "analytics_snapshots", "breach_incidents", "env_change_requests",
  "gamification_rules", "media_assets", "content_embeddings",
  "certificates", "changelog_entries", "playgrounds", "notes",
  "bookmarks", "leetcode_problems",
  // nami
  "nami_challenges", "nami_challenge_progress",
  // todo
  "todos",
  // misc
  "assignments", "reports", "seo_pages", "seo_redirects",
  "interaction_events", "web_vitals", "interaction_analytics",
  "geo_consents", "support_emails", "subscribers",
];

const { rows } = await c.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public'
`);
const existing = new Set(rows.map(r => r.table_name));

const missing = EXPECTED.filter(t => !existing.has(t));
const extra = [...existing].filter(t => !EXPECTED.includes(t)).sort();

console.log(`📊 預期 ${EXPECTED.length} 表、實際 ${existing.size} 表`);
console.log(`\n❌ 缺 ${missing.length} 表:`);
for (const m of missing) console.log(`  - ${m}`);
console.log(`\n💡 額外有的 ${extra.length} 表 (不在預期清單、可能是 supabase 內建或忘記列):`);
for (const e of extra.slice(0, 50)) console.log(`  + ${e}`);

// 看 nami_challenges 內容
const ch = await c.query(`SELECT id, level, title FROM nami_challenges ORDER BY sort_order`);
console.log(`\n🏆 nami_challenges 共 ${ch.rows.length} 題:`);
for (const r of ch.rows) console.log(`  ${r.level} | ${r.id} | ${r.title}`);

await c.end();
