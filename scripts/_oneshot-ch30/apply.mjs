#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch30.json');

const ch = JSON.parse(fs.readFileSync(CH_PATH, 'utf8'));

const files = fs.readdirSync(__dirname)
  .filter(f => /^L\d+\.content\.md$/.test(f))
  .sort();

for (const file of files) {
  const num = file.match(/^L(\d+)\.content\.md$/)[1];
  const lessonId = `30.${num}`;
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const l = ch.lessons.find(x => x.id === lessonId);
  if (!l) { console.log(`  ⚠️ ${lessonId} not found`); continue; }
  l.content = content;
  console.log(`  ✓ ${lessonId} (${l.title}) updated, new length:`, l.content.length);
}

fs.writeFileSync(CH_PATH, JSON.stringify(ch, null, 2) + '\n', 'utf8');
console.log('[ch30] DONE');
