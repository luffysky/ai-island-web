/**
 * 4 個服務最近健康狀態：Line / Telegram / Discord / AI + notifications
 * 出口都會聚到 error_logs（有 source 欄位）或 ai_messages.error
 */
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

// 1. error_logs 1h / 24h、按 source 分群
try {
  const r1h = await c.query(
    `SELECT source, level, COUNT(*) AS n
       FROM error_logs
      WHERE occurred_at >= NOW() - INTERVAL '1 hour'
      GROUP BY source, level
      ORDER BY n DESC`
  );
  const r24h = await c.query(
    `SELECT source, level, COUNT(*) AS n
       FROM error_logs
      WHERE occurred_at >= NOW() - INTERVAL '24 hours'
      GROUP BY source, level
      ORDER BY n DESC`
  );
  out.error_logs_1h = r1h.rows;
  out.error_logs_24h = r24h.rows;

  // 最近 10 條 error 訊息（看內容）
  const recent = await c.query(
    `SELECT source, level, LEFT(message, 200) AS message, occurred_at
       FROM error_logs
      WHERE occurred_at >= NOW() - INTERVAL '24 hours'
        AND level IN ('error', 'fatal', 'warn')
      ORDER BY occurred_at DESC
      LIMIT 10`
  );
  out.recent_errors = recent.rows;
} catch (e) {
  out.error_logs_err = e.message;
}

// 2. AI: ai_messages 最近 1h / 24h、看 error 欄位
try {
  const aiStats = await c.query(
    `SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS total_1h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour' AND error IS NOT NULL AND error <> '') AS err_1h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS total_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND error IS NOT NULL AND error <> '') AS err_24h
      FROM ai_messages
      WHERE role = 'assistant'`
  );
  out.ai_messages = aiStats.rows[0];

  const aiErr = await c.query(
    `SELECT LEFT(error, 200) AS error, model_used, created_at
       FROM ai_messages
      WHERE error IS NOT NULL AND error <> ''
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 5`
  );
  out.ai_recent_errors = aiErr.rows;
} catch (e) {
  out.ai_err = e.message;
}

// 3. 找出 line_/telegram_/discord_ 相關表
try {
  const tables = await c.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND (table_name LIKE 'line%' OR table_name LIKE 'telegram%' OR table_name LIKE 'discord%')
      ORDER BY table_name`
  );
  out.bot_tables = tables.rows.map((r) => r.table_name);

  // 對每個表抓最近 24h 數量
  const counts = {};
  for (const r of tables.rows) {
    try {
      const has = await c.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1 AND column_name IN ('occurred_at','received_at','sent_at')
          LIMIT 1`,
        [r.table_name]
      );
      const col = has.rows[0]?.column_name;
      if (!col) { counts[r.table_name] = "no_ts_column"; continue; }
      const q = await c.query(
        `SELECT COUNT(*) AS n FROM public."${r.table_name}" WHERE ${col} >= NOW() - INTERVAL '24 hours'`
      );
      counts[r.table_name] = Number(q.rows[0].n);
    } catch (e) {
      counts[r.table_name] = "err:" + e.message.slice(0, 60);
    }
  }
  out.bot_table_24h_activity = counts;
} catch (e) {
  out.bot_table_err = e.message;
}

// 4. notifications 最近 inserts
try {
  const n = await c.query(
    `SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS n_1h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS n_24h,
        COUNT(*) FILTER (WHERE read_at IS NULL) AS unread
      FROM notifications`
  );
  out.notifications = n.rows[0];
} catch (e) {
  out.notif_err = e.message;
}

console.log(JSON.stringify(out, null, 2));
await c.end();
