// 掃描章節 JSON 內「程式碼區塊」裡的占位符 / 偽代碼（新手複製貼上會噴錯 or 看不懂）。
// 只看 code fence（```）與明顯 code 欄位，不看說明文字，避免誤報。
// 用法：node scripts/scan-placeholder-code.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "src", "data", "chapters");

// 占位符樣式：這些名字沒定義就被呼叫/引用 → 執行必噴 NameError；且新手「看不懂」
const PATTERNS = [
  { re: /\bdo_stuff\b/, name: "do_stuff()" },
  { re: /\bdo_something\b/, name: "do_something()" },
  { re: /\byour_code_here\b/i, name: "your_code_here" },
  { re: /(?<![.\w])(foo|bar|baz)\s*\(/, name: "foo/bar/baz()" }, // 排除 .bar()（matplotlib）
  { re: /\bxxx\b|#\s*TODO\b/, name: "xxx / TODO" },
  { re: /<你的[^>]*>|<填入[^>]*>|<請[^>]*>/, name: "<你的...> 尖括號占位" },
  { re: /\bif\s+condition\s*:/, name: "if condition:" },
  { re: /\bwhile\s+condition\s*:/, name: "while condition:" },
  { re: /#\s*(你的程式|你的程式碼|處理事情|做某事|做點事|寫你的|填入|自己填)/, name: "中文占位註解" },
  { re: /\.\.\.\s*#\s*(略|省略|其他|等等)/, name: "... # 略" },
  { re: /\bsome_function\b|\bsome_var\b|\bmy_func\b/, name: "some_function/some_var" },
];

// 從一段文字抓出所有 ``` code fence 內容
function extractCodeBlocks(text) {
  const blocks = [];
  const re = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) blocks.push(m[1]);
  return blocks;
}

// 遞迴走訪任意 JSON、把所有字串挑出來（帶欄位路徑）
function* walkStrings(node, pathStr = "") {
  if (typeof node === "string") { yield [pathStr, node]; return; }
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) yield* walkStrings(node[i], `${pathStr}[${i}]`); return; }
  if (node && typeof node === "object") { for (const k of Object.keys(node)) yield* walkStrings(node[k], pathStr ? `${pathStr}.${k}` : k); }
}

const hits = [];
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  let data;
  try { data = JSON.parse(raw); } catch { console.error("parse fail", file); continue; }
  for (const [p, str] of walkStrings(data)) {
    const blocks = extractCodeBlocks(str);
    // code 欄位（key 叫 code）也直接當程式碼看
    if (/\.code$|\.code\[/.test(p) || /(^|\.)code$/.test(p)) blocks.push(str);
    for (const code of blocks) {
      for (const pat of PATTERNS) {
        if (pat.re.test(code)) {
          const lineNo = code.split("\n").findIndex((l) => pat.re.test(l)) + 1;
          hits.push({ file, path: p, pattern: pat.name, snippet: code.split("\n").filter((l) => pat.re.test(l))[0]?.trim().slice(0, 80) });
        }
      }
    }
  }
}

// 彙整
const byFile = {};
for (const h of hits) (byFile[h.file] ??= []).push(h);
const byPattern = {};
for (const h of hits) byPattern[h.pattern] = (byPattern[h.pattern] ?? 0) + 1;

console.log(`\n=== 命中總數 ${hits.length}（檔案 ${Object.keys(byFile).length}）===\n`);
console.log("依樣式：");
for (const [k, v] of Object.entries(byPattern).sort((a, b) => b[1] - a[1])) console.log(`  ${v.toString().padStart(3)}  ${k}`);
console.log("\n依檔案：");
for (const [f, arr] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  ${f} (${arr.length})`);
  for (const h of arr.slice(0, 8)) console.log(`    [${h.pattern}] ${h.path}\n        ${h.snippet}`);
}
