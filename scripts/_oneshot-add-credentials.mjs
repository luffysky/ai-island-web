#!/usr/bin/env node
// One-shot codemod：把所有 fetch("/api/...") 沒帶 credentials 的、加 credentials: "include"
// 林董 2026-05-27：登入了還是 401、確保 cookie 一定帶到 server
// 用法：node scripts/_oneshot-add-credentials.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(REPO_ROOT, 'src');

// 找所有 .ts/.tsx 檔案（跳過 node_modules / .next）
function walk(dir, results = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(ent.name)) continue;
      walk(full, results);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(SRC);
console.log(`[codemod] scanning ${files.length} files...`);

let totalFiles = 0;
let totalReplacements = 0;
const changedFiles = [];

// Pattern：fetch("/api/xxx", { 後沒接 credentials 的 → 加 credentials: "include",
// 注意：原 options object 第一行通常是 method / headers / body
// 我們在 `{` 後緊接著加 `\n      credentials: "include",`
const fetchApiPattern = /fetch\(\s*([`"'])\/api\/[^`"']+\1\s*,\s*\{(?![^{}]*credentials)/g;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let modified = original;
  let count = 0;

  modified = modified.replace(fetchApiPattern, (match) => {
    count++;
    // 在 `{` 後加新行 + credentials
    return match.replace(/\{$/, '{\n      credentials: "include",');
  });

  if (count > 0) {
    fs.writeFileSync(file, modified, 'utf8');
    totalFiles++;
    totalReplacements += count;
    changedFiles.push({ file: path.relative(REPO_ROOT, file), count });
  }
}

console.log(`\n[codemod] ✓ ${totalFiles} files changed, ${totalReplacements} fetch calls patched`);
console.log('\nChanged files:');
changedFiles.forEach(f => console.log(`  ${f.count}x  ${f.file}`));
