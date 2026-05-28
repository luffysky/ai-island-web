/** 列出所有 admin / owner、給 NOTIFY_DUAL_USERNAMES 用 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const r = await c.query(
  `SELECT id, username, display_name, role, is_owner, last_active_at
     FROM profiles
    WHERE role IN ('admin','owner') OR is_owner = true
    ORDER BY is_owner DESC, role DESC, username`
);
console.log("找到 " + r.rows.length + " 位 admin/owner：\n");
for (const p of r.rows) {
  const tag = p.is_owner ? "OWNER" : p.role;
  console.log(`  ${tag.padEnd(5)} @${p.username ?? "(no-username)"}` +
              (p.display_name ? `  「${p.display_name}」` : "") +
              `  uuid=${p.id}`);
}

console.log("\nNOTIFY_DUAL_USERNAMES 建議值（lowercase、逗號分隔）：");
const names = r.rows.map((p) => p.username?.toLowerCase()).filter(Boolean).join(",");
console.log("  " + names);

await c.end();
