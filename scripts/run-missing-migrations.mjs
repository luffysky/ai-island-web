// 跑明確缺的 migration（comment_likes / geo_consent / interaction_analytics / blog / future_schemas）
// 全部冪等（IF NOT EXISTS）、重跑安全
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const MIGRATIONS = [
  "comment_likes_migration.sql",          // → comment_likes 表
  "geo_consent_migration.sql",            // → geo_consents 表
  "interaction_analytics_migration.sql",  // → interaction_events / interaction_analytics
  "blog_migration.sql",                   // → blog_* 表（包含 subscribers / blog_posts 系列）
  "future_schemas_migration.sql",         // → reports / support_emails 等未來預留
  "notes_personalize_migration.sql",      // → notes.color / opacity / sort_order（便利貼顏色、透明度、拖移排序）
  "notes_bg_migration.sql",               // → notes.bg jsonb（每則筆記單獨背景圖：縮放/位移/旋轉）
  "notes_sharing_migration.sql",          // → note_collaborators / note_invites（共同筆記、邀請碼、多人協作）
  "notes_pin_migration.sql",              // → notes.pinned（置頂）
  "notes_title_migration.sql",            // → notes.title（可選標題、nullable）
  "notes_invite_role_migration.sql",      // → note_invites.role（邀請碼帶預設權限 editor/viewer）
  "tickets_body_email_migration.sql",     // → tickets.body / email（客服工單內文+聯絡信箱、API/後台都用到）
  "subscriptions_granted_by_migration.sql", // → subscriptions.granted_by（手動授予者）
  "soft_delete_columns_migration.sql",      // → forum_threads/user_blog_articles.deleted_at（軟刪除）
  "ai_models_tier_migration.sql",           // → ai_models.tier（AI 路由分級）
];

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map(l => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

const DB_URL = env.SUPABASE_DB_URL;
if (!DB_URL) { console.error("❌ SUPABASE_DB_URL not set"); process.exit(1); }

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

let ok = 0, fail = 0;
for (const file of MIGRATIONS) {
  const fpath = join("supabase", file);
  if (!existsSync(fpath)) {
    console.log(`⏭️  ${file} 不存在、跳過`);
    continue;
  }
  process.stdout.write(`▶️  ${file} ...`);
  try {
    const sql = readFileSync(fpath, "utf8");
    await client.query(sql);
    console.log(" ✅");
    ok++;
  } catch (e) {
    console.log(` ❌\n   ${e.message?.split("\n").slice(0, 3).join("\n   ")}`);
    fail++;
  }
}

console.log(`\n📊 完成：${ok} 成功 / ${fail} 失敗`);
await client.end();
process.exit(0);
