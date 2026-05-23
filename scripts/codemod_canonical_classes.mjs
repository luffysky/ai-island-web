// Codemod: 把全站 className 中的 `xxx-[var(--color-Y)]` 改寫成 canonical `xxx-Y`。
// Tailwind v4 在 @theme 已定義 colors（--color-bg / --color-fg-muted / --color-accent 等）、
// canonical class 與舊寫法等價、但 IDE 不會再警告 suggestCanonicalClasses。
//
// 規則：
//   抓 `(<前綴含 hover:/focus:/-l/-r/...等修飾>)-[var(--color-<name>)]`
//   → `$1-$name`
//   後綴 /N（opacity）保留不動。
//
// 跑法：node scripts/codemod_canonical_classes.mjs
//
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const exts = new Set([".tsx", ".ts", ".jsx", ".js"]);

const RE = /(\b[\w:-]+)-\[var\(--color-([\w-]+)\)\]/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (entry.isFile() && exts.has(path.extname(entry.name))) {
      processFile(p);
    }
  }
}

let totalFiles = 0;
let totalRepl = 0;

function processFile(p) {
  const src = fs.readFileSync(p, "utf8");
  let count = 0;
  const next = src.replace(RE, (_m, prefix, color) => {
    count++;
    return `${prefix}-${color}`;
  });
  if (count > 0) {
    fs.writeFileSync(p, next, "utf8");
    totalFiles++;
    totalRepl += count;
    console.log(`  ${count.toString().padStart(4)} × ${path.relative(process.cwd(), p)}`);
  }
}

walk(ROOT);
console.log(`\n✅ ${totalFiles} files, ${totalRepl} replacements`);
