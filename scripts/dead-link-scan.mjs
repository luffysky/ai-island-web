/**
 * 自動掃描 dead reference：
 *   - 找 client 端 fetch('/api/...') / Link href="/..." 引用
 *   - 找 src/app 實際存在的 route
 *   - diff 出「引用了但不存在」(broken link / 404) + 「存在但沒人引用」(dead code)
 *
 * 輸出 markdown 報告到 stdout、redirect 到檔即可：
 *   node scripts/dead-link-scan.mjs > dead-links-report.md
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src/app";

function walk(dir, out = []) {
  let items;
  try { items = readdirSync(dir); } catch { return out; }
  for (const name of items) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ====== 1. 找所有實際存在的 route ======
const allFiles = walk(ROOT);

function fileToUrlPattern(file) {
  // src/app/admin/users/[id]/page.tsx → /admin/users/[id]
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const segs = rel.split("/");
  segs.pop(); // remove page.tsx / route.ts
  // 移除 (group)
  const url = "/" + segs.filter((s) => !(s.startsWith("(") && s.endsWith(")"))).join("/");
  return url === "//" ? "/" : url;
}

const existingPages = new Set();
const existingApis = new Set();

for (const f of allFiles) {
  const base = f.replace(/\\/g, "/").split("/").pop();
  if (["page.tsx", "page.ts", "page.jsx"].includes(base)) {
    existingPages.add(fileToUrlPattern(f));
  } else if (["route.ts", "route.tsx", "route.js"].includes(base)) {
    existingApis.add(fileToUrlPattern(f));
  }
}

// ====== 2. 找所有 client 引用 ======
const fetchPattern = /fetch\(\s*[`'"]([^`'"\$]+)[`'"]/g;
const linkPattern = /href\s*=\s*[{`'"]([^`'"\$}]+)[`'"\}]/g;
const fetchedApis = new Map(); // url -> Set of source files
const linkedPages = new Map();

for (const f of allFiles) {
  // 不掃 page.tsx 自己以外的 client component / lib / hooks
  if (f.match(/\.(tsx?|jsx?|mjs)$/) === null) continue;
  let content;
  try { content = readFileSync(f, "utf8"); } catch { continue; }

  let m;
  while ((m = fetchPattern.exec(content)) !== null) {
    const url = m[1];
    if (!url.startsWith("/api/")) continue;
    if (!fetchedApis.has(url)) fetchedApis.set(url, new Set());
    fetchedApis.get(url).add(f);
  }

  while ((m = linkPattern.exec(content)) !== null) {
    const url = m[1];
    // 只看內部 link（"/" 開頭、不是 //、不是 http）
    if (!url.startsWith("/")) continue;
    if (url.startsWith("//")) continue;
    if (url.includes("$")) continue; // skip template literals fragments
    // strip query / hash
    const clean = url.split("?")[0].split("#")[0];
    if (!clean) continue;
    if (!linkedPages.has(clean)) linkedPages.set(clean, new Set());
    linkedPages.get(clean).add(f);
  }
}

// ====== 3. 匹配存不存在 (處理動態路徑) ======
function matchExisting(url, set) {
  if (set.has(url)) return true;
  // 跑一次每個 existing pattern 看是否能對應 (含 [id])
  for (const pattern of set) {
    if (!pattern.includes("[")) continue;
    // /admin/users/[id] → ^/admin/users/[^/]+$
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/\[\.{3}[^\]]+\]/g, ".+")
          .replace(/\[[^\]]+\]/g, "[^/]+") +
        "$",
    );
    if (regex.test(url)) return true;
  }
  return false;
}

// ====== 4. 輸出報告 ======
const lines = [];
lines.push("# 全站 dead-reference 掃描報告\n");
lines.push(`產生時間：${new Date().toISOString()}\n`);
lines.push(`掃描：${allFiles.length} 個檔案、${existingPages.size} 個 page、${existingApis.size} 個 API\n`);

// 4a. 死引用 — client 呼叫 /api/... 但 endpoint 不存在
const deadFetches = [];
for (const [url, sources] of fetchedApis) {
  // strip query / template fragment
  const clean = url.split("?")[0].split("#")[0].replace(/\$\{.*\}/g, "");
  if (!clean.startsWith("/api/")) continue;
  if (!matchExisting(clean, existingApis)) {
    deadFetches.push({ url, sources: Array.from(sources) });
  }
}

lines.push(`\n## ❌ Client 呼叫了不存在的 API (${deadFetches.length})\n`);
if (deadFetches.length === 0) {
  lines.push("（無）\n");
} else {
  for (const d of deadFetches.sort((a, b) => a.url.localeCompare(b.url))) {
    lines.push(`- \`${d.url}\``);
    for (const s of d.sources.slice(0, 5)) {
      lines.push(`  - 來自 \`${s.replace(/\\/g, "/")}\``);
    }
    if (d.sources.length > 5) lines.push(`  - ...還有 ${d.sources.length - 5} 個檔案`);
  }
}

// 4b. 死 Link
const deadLinks = [];
for (const [url, sources] of linkedPages) {
  // 跳過特殊路徑
  if (["/", "/login", "/signup"].includes(url)) continue;
  if (url.startsWith("/api/")) {
    if (!matchExisting(url, existingApis)) {
      deadLinks.push({ url, sources: Array.from(sources), kind: "api" });
    }
    continue;
  }
  // 後台需要 slug、Link 是寫死 /admin/X、運行時被改寫加 slug、所以這個 audit 對 admin 不準
  // 但我們可以幫忙看 /admin/X 是否有對應 page
  if (!matchExisting(url, existingPages)) {
    deadLinks.push({ url, sources: Array.from(sources), kind: "page" });
  }
}

lines.push(`\n## ❌ Link href 指向不存在的路徑 (${deadLinks.length})\n`);
if (deadLinks.length === 0) {
  lines.push("（無）\n");
} else {
  for (const d of deadLinks.sort((a, b) => a.url.localeCompare(b.url))) {
    lines.push(`- \`${d.url}\` (${d.kind})`);
    for (const s of d.sources.slice(0, 3)) {
      lines.push(`  - 來自 \`${s.replace(/\\/g, "/")}\``);
    }
    if (d.sources.length > 3) lines.push(`  - ...還有 ${d.sources.length - 3} 個檔案`);
  }
}

// 4c. 沒人引用的 API (可能是 dead code、或外部 webhook 入口)
const unusedApis = [];
for (const api of existingApis) {
  // 跳過明顯的 external endpoint
  if (api.match(/^\/api\/(line-webhook|cron|auth|og|debug|health|public|stripe-webhook)/)) continue;
  if (api.match(/^\/api\/admin\//)) continue; // admin API 大多在 admin page 引用、check 比較鬆
  let referenced = false;
  for (const [url] of fetchedApis) {
    const clean = url.split("?")[0].replace(/\$\{.*\}/g, "");
    if (clean === api) { referenced = true; break; }
    if (api.includes("[")) {
      const regex = new RegExp(
        "^" + api.replace(/\[\.{3}[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+") + "$"
      );
      if (regex.test(clean)) { referenced = true; break; }
    }
  }
  if (!referenced) unusedApis.push(api);
}

lines.push(`\n## ⚠️ 可能沒人引用的非 admin API (${unusedApis.length})\n`);
lines.push(`> 可能是 dead code、也可能我的 grep 漏掉模板字串。手動確認。\n`);
if (unusedApis.length === 0) {
  lines.push("（無）\n");
} else {
  for (const a of unusedApis.sort()) {
    lines.push(`- \`${a}\``);
  }
}

console.log(lines.join("\n"));
