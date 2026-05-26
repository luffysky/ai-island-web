#!/usr/bin/env node
// One-shot codemod：修整本書 75 章 chapter content 內 tip box 4 空白縮排 bug
// 林董 2026-05-27：tip box（**☕ 用人話講** / 💼 接案小知識 等）被 markdown renderer
// 當成 code block 顯示、原因是前面 4 空白縮排（markdown 規範：4 空白 = code block）
// 修法：把 ```text / ```python 等 fence **外**、行首 4+ 空白縮排全部去掉
//
// 用法：node scripts/_oneshot-fix-tipbox.mjs
//   --dry-run 只印 diff 不寫回（測試用）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(REPO_ROOT, 'src', 'data', 'chapters');

const DRY = process.argv.includes('--dry-run');

/**
 * 處理一個 lesson.content 字串、去掉 fence 外的縮排
 * 規則：
 *   1. 偵測 ``` fence 開關
 *   2. fence 內 → 不動（保留 code block 縮排）
 *   3. fence 外、行首 4+ 空白 → 全去掉
 *   4. 「  」（雙空白行、原本拿來當段落分隔）保留
 */
function fixContent(content) {
  const lines = content.split('\n');
  let inFence = false;
  let changedLines = 0;
  const out = lines.map((line) => {
    // 偵測 ``` fence（含 ```text / ```python / ``` 等）
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    // fence 內、不動
    if (inFence) return line;
    // fence 外、行首 4+ 空白縮排 → 去掉
    // 但「兩空白」單獨成行（段落分隔慣例）保留
    if (/^    +\S/.test(line)) {
      changedLines++;
      return line.replace(/^ +/, '');
    }
    if (/^    +$/.test(line)) {
      // 全空白行（4+ 空白）→ 變空行
      changedLines++;
      return '';
    }
    return line;
  });
  return { content: out.join('\n'), changedLines };
}

const files = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.json')).sort();
console.log(`[fix-tipbox] processing ${files.length} chapters... DRY=${DRY}`);

let totalChapters = 0;
let totalLessons = 0;
let totalChangedLines = 0;

for (const file of files) {
  const filePath = path.join(CHAPTERS_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf8');
  const ch = JSON.parse(raw);

  let chChanged = 0;
  let chLessonsChanged = 0;

  for (const lesson of ch.lessons) {
    if (!lesson.content) continue;
    const { content: newContent, changedLines } = fixContent(lesson.content);
    if (changedLines > 0) {
      lesson.content = newContent;
      chChanged += changedLines;
      chLessonsChanged++;
    }
  }

  if (chChanged > 0) {
    totalChapters++;
    totalLessons += chLessonsChanged;
    totalChangedLines += chChanged;
    console.log(`  ${file.padEnd(11)} ${chLessonsChanged} lessons / ${chChanged} lines patched`);
    if (!DRY) {
      const out = JSON.stringify(ch, null, 2) + '\n';
      fs.writeFileSync(filePath, out, 'utf8');
    }
  }
}

console.log(`\n[fix-tipbox] ${DRY ? 'DRY' : 'APPLIED'}: ${totalChapters} chapters / ${totalLessons} lessons / ${totalChangedLines} lines`);
