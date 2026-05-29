import pg from "pg";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 1. todo board
const b = await c.query(`SELECT id, slug, title FROM admin_kanban_boards WHERE slug = 'todo'`);
console.log("=== board: todo ===");
console.table(b.rows);

if (b.rows.length === 0) { console.log("❌ board 找不到"); await c.end(); process.exit(0); }

// 2. columns of todo board
const cols = await c.query(`SELECT id, title FROM admin_kanban_columns WHERE board_id = $1`, [b.rows[0].id]);
console.log("\n=== columns ===");
console.table(cols.rows);

// 3. cards in TODO + DOING
const activeIds = cols.rows.filter(r => r.title === "TODO" || r.title === "DOING").map(r => r.id);
console.log(`\n=== active column ids (TODO + DOING) ===`);
console.log(activeIds);

if (activeIds.length === 0) {
  console.log("❌ 沒找到 TODO/DOING column、API 會回「TODO/DOING 都空」");
}

const cards = await c.query(`
  SELECT id, title, description, category, updated_at
    FROM admin_kanban_cards
   WHERE column_id = ANY($1)
   ORDER BY position
`, [activeIds]);
console.log(`\n=== cards (${cards.rows.length}) ===`);
console.table(cards.rows.map(r => ({ title: r.title, category: r.category })));

await c.end();
