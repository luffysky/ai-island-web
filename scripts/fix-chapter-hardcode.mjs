// 批改所有 chapter JSON 內 hardcode 章節數 (例：「60 章」「71 章」)、
// 改成跟現在站台一致的章節數 (動態算)。
//
// 用法：node scripts/fix-chapter-hardcode.mjs [--dry]
//   --dry：只看會改哪些、不動檔
//
// 注意：練習編號 ("應用 71" / "應用 171") 是練習題編號、不動。

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");

const DIR = "src/data/chapters";
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));

// 算現在的活章節數
const allChapters = files.map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));
const totalChapters = allChapters.length;
const totalLessons = allChapters.reduce((s, c) => s + (c.lessons?.length ?? 0), 0);

console.log(`📊 目前 ${totalChapters} 章、${totalLessons} lessons`);
console.log(`🔧 改寫 hardcode (60 章 / 71 章 → ${totalChapters} 章)\n`);

// 改寫規則 — 只改「描述本站章數」的句、不動練習編號
const RULES = [
  // 「60 章課程 / 71 章課程」描述本站
  { from: /\b60\s*章課程\b/g, to: `${totalChapters} 章課程` },
  { from: /\b71\s*章課程\b/g, to: `${totalChapters} 章課程` },
  // 「2026 全端養成 60/71 章課程」 (ch01 範例)
  { from: /(全端養成)\s*60\s*章/g, to: `$1 ${totalChapters} 章` },
  { from: /(全端養成)\s*71\s*章/g, to: `$1 ${totalChapters} 章` },
  // 「共 60 章 / 71 章」
  { from: /共\s*60\s*章/g, to: `共 ${totalChapters} 章` },
  { from: /共\s*71\s*章/g, to: `共 ${totalChapters} 章` },
  // 1136+ lesson 全站總數
  { from: /\b1136\+?\s*lesson/gi, to: `${totalLessons}+ lesson` },
  { from: /\b1100\+?\s*lesson/gi, to: `${totalLessons}+ lesson` },
];

let changedFiles = 0;
let totalReplaces = 0;
const summary = [];

for (const file of files) {
  const path = join(DIR, file);
  const orig = readFileSync(path, "utf8");
  let updated = orig;
  let fileReplaces = 0;
  for (const r of RULES) {
    const matches = updated.match(r.from);
    if (matches) {
      fileReplaces += matches.length;
      updated = updated.replace(r.from, r.to);
    }
  }
  if (updated !== orig) {
    changedFiles++;
    totalReplaces += fileReplaces;
    summary.push(`  ${file}: ${fileReplaces} 處`);
    if (!DRY) writeFileSync(path, updated);
  }
}

console.log(`\n${DRY ? "🧪 DRY RUN " : "✅ "}改了 ${changedFiles} 檔、共 ${totalReplaces} 處:`);
for (const s of summary) console.log(s);
if (DRY) console.log("\n再跑 (不帶 --dry) 套用");
