/**
 * 比對 pg 直連 (SUPABASE_DB_URL) vs supabase-js (NEXT_PUBLIC_SUPABASE_URL + SERVICE_ROLE_KEY)
 * 兩個 client 查 lessons 表的結果是否一致、確認是不是指向不同 project
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

// 從 SUPABASE_DB_URL 抓 host 看 project ref（不 echo 完整 URL）
const dbHost = env.SUPABASE_DB_URL?.match(/@([^/:]+)/)?.[1] || "unknown";
const apiHost = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https?:\/\/([^/]+)/)?.[1] || "unknown";
console.log(`pg 直連 host: ${dbHost.slice(0, 30)}...`);
console.log(`supabase-js host: ${apiHost.slice(0, 30)}...`);
console.log(`兩邊看起來 ${dbHost.includes(apiHost.split(".")[0]) || apiHost.includes(dbHost.split(".")[0]) ? "✓ 同 project" : "✗ 不同 project"}\n`);

// pg 直連
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const r1 = await c.query(`SELECT chapter_id, COUNT(*) AS n FROM lessons WHERE chapter_id IN (68,72,73,74,75) GROUP BY chapter_id ORDER BY chapter_id`);
console.log("pg 直連 (SUPABASE_DB_URL):");
for (const row of r1.rows) console.log(`  Ch${row.chapter_id}: ${row.n} lessons`);
await c.end();

// supabase-js (跟 production 同 client)
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const counts = {};
for (const cid of [68, 72, 73, 74, 75]) {
  const { count } = await supa.from("lessons").select("*", { count: "exact", head: true }).eq("chapter_id", cid);
  counts[cid] = count;
}
console.log("\nsupabase-js (NEXT_PUBLIC_SUPABASE_URL + SERVICE_ROLE_KEY):");
for (const cid of [68, 72, 73, 74, 75]) console.log(`  Ch${cid}: ${counts[cid]} lessons`);

console.log("\n--- production /api/nav 回的數字（之前 query）---");
console.log("  Ch68: 11, Ch72: 3, Ch73: 2, Ch74: 1, Ch75: 4");

console.log("\n如果三組數字都不一致 → 三邊 DB 不同");
console.log("如果 pg + supabase-js 一致、跟 production /api/nav 不同 → production env 連別的 DB");
console.log("如果 supabase-js = production /api/nav → 你環境本機跟 production 用同個 DB（DB 上真的就是少 row）");
