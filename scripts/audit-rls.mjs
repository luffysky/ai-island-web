/**
 * 全資料庫 RLS policy 審計
 *   - 找 FOR ALL / FOR INSERT 但缺 WITH CHECK 的 policy
 *   - 找 RLS enabled 但完全沒 policy 的表（會擋全部）
 *   - 找前端會直接寫但表沒 user_id check 的
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

// 拿所有 public table + RLS 狀態 + policy
const tables = await c.query(`
  SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname;
`);

const policies = await c.query(`
  SELECT
    n.nspname AS schema,
    c.relname AS table,
    pol.polname AS name,
    pol.polcmd AS cmd,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  ORDER BY c.relname, pol.polname;
`);

const cmdMap = { "*": "ALL", r: "SELECT", a: "INSERT", w: "UPDATE", d: "DELETE" };

const byTable = new Map();
for (const t of tables.rows) {
  byTable.set(t.relname, { rls: t.relrowsecurity, policies: [] });
}
for (const p of policies.rows) {
  byTable.get(p.table)?.policies.push(p);
}

const lines = [];
lines.push("# RLS 安全審計報告\n");
lines.push(`產生時間：${new Date().toISOString()}\n`);
lines.push(`掃描 ${tables.rows.length} 張表、${policies.rows.length} 條 policy\n\n`);

// 1. RLS enabled 但 0 policy
const rlsButEmpty = [];
for (const [name, info] of byTable) {
  if (info.rls && info.policies.length === 0) rlsButEmpty.push(name);
}
lines.push(`## 🔴 致命：RLS 開但 0 policy (這些表只有 service_role 能寫) (${rlsButEmpty.length})\n`);
for (const t of rlsButEmpty) lines.push(`- \`${t}\``);
lines.push("");

// 2. RLS 沒開
const rlsOff = [];
for (const [name, info] of byTable) {
  if (!info.rls) rlsOff.push(name);
}
lines.push(`\n## 🟡 警告：RLS 未啟用 (任何人能直接撈) (${rlsOff.length})\n`);
for (const t of rlsOff) lines.push(`- \`${t}\``);
lines.push("");

// 3. FOR ALL / FOR INSERT / FOR UPDATE 缺 WITH CHECK
const missingCheck = [];
for (const p of policies.rows) {
  if ((p.cmd === "*" || p.cmd === "a" || p.cmd === "w") && !p.check_expr) {
    missingCheck.push(p);
  }
}
lines.push(`\n## ⚠️ FOR ${"{ALL/INSERT/UPDATE}"} policy 缺 WITH CHECK (${missingCheck.length})\n`);
lines.push("> Postgres 對 FOR ALL 缺 WITH CHECK 時、會用 USING 當 check、但某些 client 版本 / 升級時會擋下。最佳實踐：兩個都寫。\n\n");
for (const p of missingCheck) {
  lines.push(`- \`${p.table}\` · ${cmdMap[p.cmd]} · \`${p.name}\` · USING: \`${p.using_expr}\``);
}
lines.push("");

// 4. 列所有表 + policy 概覽
lines.push(`\n## 📋 全表 RLS 狀態總覽\n`);
lines.push("| 表 | RLS | policy 數 | INSERT 保護 |");
lines.push("|---|---|---|---|");
for (const [name, info] of byTable) {
  const hasInsertPolicy = info.policies.some(p => p.cmd === "*" || p.cmd === "a");
  const hasCheck = info.policies.some(p => (p.cmd === "*" || p.cmd === "a") && p.check_expr);
  const status = !info.rls ? "❌ 關" : info.policies.length === 0 ? "🔴 空" : hasInsertPolicy ? (hasCheck ? "✅" : "🟡 無 CHECK") : "—";
  lines.push(`| \`${name}\` | ${info.rls ? "✓" : "✗"} | ${info.policies.length} | ${status} |`);
}

console.log(lines.join("\n"));
await c.end();
