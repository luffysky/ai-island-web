import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]),
);

// ---------- 1. 載入 DB schema ----------
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await client.connect();
const cols = await client.query(`
  select table_name, column_name from information_schema.columns
  where table_schema='public'`);
const tableCols = {};
for (const r of cols.rows) (tableCols[r.table_name] ??= new Set()).add(r.column_name);
const rpcs = new Set((await client.query(
  `select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`,
)).rows.map((r) => r.proname));
await client.end();
const tableNames = new Set(Object.keys(tableCols));

// ---------- walk source ----------
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const files = walk("src");

// ---------- 2. 欄位驗證（精準鏈式範圍）----------
const colIssues = [];
const KNOWN_NON_COL = new Set(["*", "count"]);
// 從 idx（指向 .from 的 . ）抓出「只屬於這個 query」的鏈：連續的 .method(...)，括號平衡
function chainAfter(s, fromStart) {
  // 先跳過 .from(...) 本身
  let i = s.indexOf("(", fromStart);
  let depth = 0; i;
  // 找 .from( 的對應 )
  let j = i, d = 0;
  for (; j < s.length; j++) { if (s[j] === "(") d++; else if (s[j] === ")") { d--; if (d === 0) { j++; break; } } }
  // 之後連續吃 .method(...)
  let chain = "";
  while (true) {
    let k = j; while (k < s.length && /\s/.test(s[k])) k++;
    if (s[k] !== ".") break;
    // method name
    let n = k + 1; while (n < s.length && /[\w$]/.test(s[n])) n++;
    if (s[n] !== "(") break;
    // balanced args
    let dd = 0, e = n;
    for (; e < s.length; e++) { if (s[e] === "(") dd++; else if (s[e] === ")") { dd--; if (dd === 0) { e++; break; } } }
    chain += s.slice(k, e);
    j = e;
  }
  return chain;
}
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const re = /\.from\(\s*["'`]([a-z_][a-z0-9_]*)["'`]\s*\)/g;
  let m;
  while ((m = re.exec(s))) {
    const table = m[1];
    const line = s.slice(0, m.index).split("\n").length;
    if (!tableNames.has(table)) { colIssues.push({ f, line, table, col: "(TABLE)", kind: "table-not-found" }); continue; }
    const cset = tableCols[table];
    const chain = chainAfter(s, m.index);
    // select("...") — 只取 depth 0 的欄位，embedded join 的 rel(...) 內欄位略過
    const sel = chain.match(/\.select\(\s*["'`]([^"'`]*)["'`]/);
    if (sel) {
      const str = sel[1];
      let depth = 0, cur = "";
      const top = [];
      for (const ch of str) {
        if (ch === "(") { depth++; cur += ch; }
        else if (ch === ")") { depth--; cur += ch; }
        else if (ch === "," && depth === 0) { top.push(cur); cur = ""; }
        else cur += ch;
      }
      top.push(cur);
      for (let c of top) {
        c = c.trim();
        if (!c || c.includes("(") || c.includes(":") || c.includes("!") || c.includes("-") || c.includes(".")) continue; // embed/alias/json
        if (!KNOWN_NON_COL.has(c) && !cset.has(c)) colIssues.push({ f, line, table, col: c, kind: "select" });
      }
    }
    // filters / order
    for (const mm of chain.matchAll(/\.(eq|neq|gt|gte|lt|lte|like|ilike|order|is|in|contains)\(\s*["'`]([a-z_][a-z0-9_]*)["'`]/g)) {
      if (!cset.has(mm[2]) && !KNOWN_NON_COL.has(mm[2])) colIssues.push({ f, line, table, col: mm[2], kind: mm[1] });
    }
    // insert/update/upsert object keys（單一物件、淺層）
    for (const mm of chain.matchAll(/\.(insert|update|upsert)\(\s*\{([^{}]*)\}/g)) {
      for (const km of mm[2].matchAll(/(?:^|,)\s*([a-z_][a-z0-9_]*)\s*:/g)) {
        if (!cset.has(km[1]) && !KNOWN_NON_COL.has(km[1])) colIssues.push({ f, line, table, col: km[1], kind: mm[1] });
      }
    }
  }
}

// ---------- 3. route 註冊 + fetch 對應 ----------
const routeFiles = walk("src/app/api").filter((f) => /[/\\]route\.ts$/.test(f));
const routes = routeFiles.map((f) => {
  const rel = f.replace(/^src[/\\]app/, "").replace(/[/\\]route\.ts$/, "").replace(/\\/g, "/");
  const methods = [...fs.readFileSync(f, "utf8").matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g)].map((x) => x[1]);
  return { path: rel || "/", methods, f };
});
const noMethod = routes.filter((r) => r.methods.length === 0);
// route matcher（[x] → 任意段）
const routeRe = routes.map((r) => ({ ...r, re: new RegExp("^" + r.path.replace(/\[[^\]]+\]/g, "[^/]+").replace(/\//g, "\\/") + "$") }));
// 收集 fetch("/api/..") 的靜態前綴
const fetched = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  for (const mm of s.matchAll(/["'`](\/api\/[a-zA-Z0-9_\-/[\]${}.]*)/g)) {
    let p = mm[1].split(/[?`'"]/)[0];
    p = p.replace(/\$\{[^}]+\}/g, "*"); // 模板變數 → *
    if (p.length > 4) fetched.add(p);
  }
}
const unmatched = [];
for (const p of fetched) {
  const probe = p.replace(/\*/g, "x").replace(/\[[^\]]+\]/g, "x").replace(/\/$/, "") || "/";
  if (!routeRe.some((r) => r.re.test(probe))) unmatched.push(p);
}

// ---------- 報告 ----------
console.log("================ DB 欄位錯接 ================");
const realCol = colIssues.filter((i) => i.kind !== "table-not-found");
const realTbl = colIssues.filter((i) => i.kind === "table-not-found");
if (!realCol.length) console.log("✅ 沒發現 select/eq/order 等接到不存在的欄位");
for (const i of realCol) console.log(`  ✗ ${i.table}.${i.col}  [${i.kind}]  ${i.f}:${i.line}`);
console.log("\n--- .from() 用到非 public table（多半是 view / typo，需人工看）---");
[...new Set(realTbl.map((i) => i.table))].sort().forEach((t) => console.log("  ?", t));

console.log("\n================ Route 註冊 ================");
console.log(`route.ts 檔: ${routes.length}`);
if (noMethod.length) { console.log("⚠️ 沒有任何 HTTP method export 的 route:"); noMethod.forEach((r) => console.log("  ✗", r.f)); }
else console.log("✅ 每支 route 都有 export HTTP method");

console.log("\n================ fetch 對不到 route ================");
const apiUnmatched = unmatched.filter((p) => !p.includes("*") || p.split("/").length > 3);
if (!apiUnmatched.length) console.log("✅ 所有 /api fetch 都對得到 route（或為動態，已寬鬆比對）");
else apiUnmatched.sort().forEach((p) => console.log("  ✗", p));
