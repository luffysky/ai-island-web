/** 查 cron 健康 + AI 真實使用量 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const out = {};

// 1. error_logs 找 cron / api/admin/ga4/sync 相關
try {
  const r = await c.query(
    `SELECT source, level, LEFT(message, 200) AS message, occurred_at
       FROM error_logs
      WHERE occurred_at >= NOW() - INTERVAL '7 days'
        AND (source ILIKE '%cron%' OR source ILIKE '%/cron/%' OR message ILIKE '%cron%' OR request_path ILIKE '%/cron/%' OR request_path ILIKE '%ga4/sync%')
      ORDER BY occurred_at DESC
      LIMIT 20`
  );
  out.cron_errors_7d = r.rows;
} catch (e) { out.cron_err = e.message; }

// 2. analytics_snapshots：cron job ga4-daily-sync 寫入
try {
  const r = await c.query(
    `SELECT date, source, updated_at FROM analytics_snapshots
      ORDER BY date DESC LIMIT 7`
  );
  out.analytics_snapshots_latest = r.rows;
} catch (e) { out.analytics_err = e.message; }

// 3. audit_logs 找 cron actor (cron job 通常 actor=system / cron)
try {
  const r = await c.query(
    `SELECT action, actor_username, COUNT(*) AS n, MAX(created_at) AS latest
       FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND (actor_username ILIKE '%cron%' OR actor_username ILIKE '%system%' OR action ILIKE '%cron%')
      GROUP BY action, actor_username
      ORDER BY latest DESC
      LIMIT 20`
  );
  out.cron_audit_7d = r.rows;
} catch (e) { out.audit_err = e.message; }

// 4. AI: 24h conversation / message 數
try {
  const r = await c.query(
    `SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS conv_1h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS conv_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS conv_7d
      FROM ai_conversations`
  );
  out.ai_conversations = r.rows[0];

  const m = await c.query(
    `SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND role='user') AS user_msg_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND role='assistant') AS asst_msg_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND error IS NOT NULL AND error <> '') AS err_24h
      FROM ai_messages`
  );
  out.ai_messages_24h = m.rows[0];
} catch (e) { out.ai_q_err = e.message; }

// 5. notifications: 看林董 user 的最近通知
try {
  const r = await c.query(
    `SELECT id, type, COUNT(*) AS n
       FROM notifications
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY id, type
      ORDER BY n DESC
      LIMIT 10`
  );
  out.notifications_by_type_24h = r.rows;

  const recent = await c.query(
    `SELECT type, LEFT(title, 80) AS title, created_at
       FROM notifications
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC LIMIT 10`
  );
  out.recent_notifications = recent.rows;
} catch (e) { out.notif_err = e.message; }

console.log(JSON.stringify(out, null, 2));
await c.end();
