/**
 * 把 luffysky004 從 OWNER 降成普通 member
 *   - role: owner / admin → user
 *   - is_owner: true → false
 * 林董 2026-05-29 明確指示。
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

// before
const before = await c.query(
  `SELECT id, username, display_name, role, is_owner FROM profiles WHERE username = 'luffysky004'`
);
console.log("Before:", JSON.stringify(before.rows, null, 2));

if (before.rowCount !== 1) {
  console.error("✗ Expected exactly 1 row, got", before.rowCount);
  process.exit(1);
}

// update
const r = await c.query(
  `UPDATE profiles SET role = 'member', is_owner = false
    WHERE username = 'luffysky004'
    RETURNING id, username, role, is_owner`
);
console.log("After update:", JSON.stringify(r.rows, null, 2));

await c.end();
console.log("\n✓ luffysky004 降為一般 member");
