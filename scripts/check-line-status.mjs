import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

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

console.log("\n============ 表 schema 檢查 ============");
const tableCheck = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('tickets', 'ticket_messages', 'notification_settings', 'app_settings', 'line_bind_codes', 'canned_replies', 'media_assets', 'content_embeddings', 'audit_logs', 'error_logs', 'profiles')
  ORDER BY table_name;
`);
console.log("找到表：", tableCheck.rows.map(r => r.table_name).join(", "));

console.log("\n============ tickets / ticket_messages 欄位 ============");
const ticketsCols = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tickets'
  ORDER BY ordinal_position;
`);
console.log("tickets cols:", ticketsCols.rows.map(r => `${r.column_name}(${r.data_type})`).join(", "));

const msgCols = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'ticket_messages'
  ORDER BY ordinal_position;
`);
console.log("ticket_messages cols:", msgCols.rows.map(r => `${r.column_name}(${r.data_type})`).join(", "));

console.log("\n============ 最近 24hr tickets ============");
const recentTickets = await client.query(`
  SELECT id, user_id, subject, category, status, priority, meta, created_at
  FROM public.tickets
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 20;
`);
console.log(`24hr ticket 數：${recentTickets.rows.length}`);
for (const t of recentTickets.rows) {
  console.log(`  - ${t.id.slice(0,8)} | ${t.status} | ${t.subject?.slice(0,40)} | meta.source=${t.meta?.source ?? 'null'} | line=${t.meta?.line_user_id?.slice(0,10) ?? '-'}`);
}

console.log("\n============ 最近 24hr ticket_messages ============");
const recentMsgs = await client.query(`
  SELECT id, ticket_id, sender_type, author_type, content, body, created_at
  FROM public.ticket_messages
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 20;
`);
console.log(`24hr ticket_messages 數：${recentMsgs.rows.length}`);
for (const m of recentMsgs.rows) {
  console.log(`  - ticket=${m.ticket_id?.slice(0,8)} | sender=${m.sender_type ?? m.author_type ?? '?'} | text="${(m.content || m.body || '').slice(0,50)}"`);
}

console.log("\n============ 最近 24hr error_logs (line-webhook) ============");
const recentErrors = await client.query(`
  SELECT id, source, level, message, meta, created_at
  FROM public.error_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND (source LIKE '%line%' OR source LIKE '%webhook%' OR message LIKE '%line%')
  ORDER BY created_at DESC
  LIMIT 10;
`).catch(e => ({ rows: [], err: e.message }));
if (recentErrors.err) {
  console.log("error_logs 查不到：", recentErrors.err);
} else {
  console.log(`找到 ${recentErrors.rows.length} 筆 line 相關錯誤：`);
  for (const e of recentErrors.rows) {
    console.log(`  - [${e.level}] ${e.source} | ${e.message?.slice(0,80)}`);
  }
}

console.log("\n============ 已綁 LINE 的 profile ============");
const lineProfiles = await client.query(`
  SELECT id, username, display_name, line_user_id, line_bound_at, line_notify_enabled
  FROM public.profiles
  WHERE line_user_id IS NOT NULL
  ORDER BY line_bound_at DESC NULLS LAST
  LIMIT 10;
`);
console.log(`綁定 user 數：${lineProfiles.rows.length}`);
for (const p of lineProfiles.rows) {
  console.log(`  - @${p.username} | line=${p.line_user_id?.slice(0,12)} | notify=${p.line_notify_enabled}`);
}

console.log("\n============ notification_settings 數 ============");
const ns = await client.query(`SELECT COUNT(*) as n FROM notification_settings;`);
console.log(`notification_settings rows: ${ns.rows[0].n}`);

console.log("\n============ app_settings 補欄位確認 ============");
const appSetCols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'app_settings'
  ORDER BY ordinal_position;
`);
console.log("app_settings cols:", appSetCols.rows.map(r => r.column_name).join(", "));

await client.end();
