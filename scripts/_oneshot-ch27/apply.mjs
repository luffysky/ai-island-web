#!/usr/bin/env node
// ch27 Python 資料分析改寫 apply script
// 用法：node scripts/_oneshot-ch27/apply.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH27_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch27.json');

console.log('[ch27] reading:', CH27_PATH);
const ch27 = JSON.parse(fs.readFileSync(CH27_PATH, 'utf8'));
console.log('[ch27] lessons:', ch27.lessons.length);

// 列出所有 .content.md 檔、自動 apply
const contentDir = __dirname;
const contentFiles = fs.readdirSync(contentDir)
  .filter(f => /^L\d+\.content\.md$/.test(f))
  .sort();

console.log('[ch27] found content files:', contentFiles.length);

for (const file of contentFiles) {
  const num = file.match(/^L(\d+)\.content\.md$/)[1];
  const lessonId = `27.${num}`;
  const content = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const l = ch27.lessons.find(x => x.id === lessonId);
  if (!l) {
    console.log(`  ⚠️ ${lessonId} not found`);
    continue;
  }
  l.content = content;
  console.log(`  ✓ ${lessonId} (${l.title}) updated, new length:`, l.content.length);
}

const out = JSON.stringify(ch27, null, 2) + '\n';
fs.writeFileSync(CH27_PATH, out, 'utf8');
console.log('[ch27] wrote ch27.json,', out.length, 'bytes');

const verify = JSON.parse(fs.readFileSync(CH27_PATH, 'utf8'));
console.log('[ch27] verify: total lessons =', verify.lessons.length);
console.log('[ch27] DONE ✅');
