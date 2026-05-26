#!/usr/bin/env node
// ch28 Python 爬蟲改寫 apply script
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch28.json');

console.log('[ch28] reading:', CH_PATH);
const ch = JSON.parse(fs.readFileSync(CH_PATH, 'utf8'));

const contentDir = __dirname;
const contentFiles = fs.readdirSync(contentDir)
  .filter(f => /^L\d+\.content\.md$/.test(f))
  .sort();

console.log('[ch28] found content files:', contentFiles.length);

for (const file of contentFiles) {
  const num = file.match(/^L(\d+)\.content\.md$/)[1];
  const lessonId = `28.${num}`;
  const content = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const l = ch.lessons.find(x => x.id === lessonId);
  if (!l) {
    console.log(`  ⚠️ ${lessonId} not found`);
    continue;
  }
  l.content = content;
  console.log(`  ✓ ${lessonId} (${l.title}) updated, new length:`, l.content.length);
}

fs.writeFileSync(CH_PATH, JSON.stringify(ch, null, 2) + '\n', 'utf8');
console.log('[ch28] DONE');
