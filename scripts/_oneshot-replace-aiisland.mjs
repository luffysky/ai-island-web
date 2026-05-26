#!/usr/bin/env node
// One-shot: 把所有 aiisland.tw → ai-island-web.snowrealm.pet
// 林董 2026-05-26：aiisland.tw 是別人的網域、我們是 ai-island-web.snowrealm.pet
// 用法：node scripts/_oneshot-replace-aiisland.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const FROM = 'aiisland.tw';
const TO = 'ai-island-web.snowrealm.pet';

// 全 grep 結果 25 個檔案
const FILES = [
  // P0 SEO 核武（fallback 預設 URL）
  'src/lib/seo-jsonld.ts',
  'src/app/layout.tsx',
  'src/app/chapters/page.tsx',
  'src/app/llms.txt/route.ts',
  'src/app/search/page.tsx',
  // P1 API env fallback
  'src/app/api/telegram-webhook/route.ts',
  'src/app/api/line-webhook/route.ts',
  'src/app/api/line-webhook-user/route.ts',
  'src/app/api/cron/kpi-email/route.ts',
  'src/app/api/admin/embeddings/reindex/route.ts',
  'src/app/api/admin/tickets/[id]/reply/route.ts',
  'src/app/admin/chapters/[id]/seo/page.tsx',
  'src/app/admin/marketing/utm/page.tsx',
  // P2 AI prompt 寫死字串
  'src/lib/ai-tutor-prompt.ts',
  'src/app/api/admin/marketing/copy/generate/route.ts',
  // P3 Email / placeholder / config
  'src/lib/email.ts',
  'src/app/admin/marketing/utm/UtmBuilderClient.tsx',
  'src/app/admin/marketing/copy/CopyGeneratorClient.tsx',
  'README.md',
  '.env.example',
  'supabase/canned_replies_migration.sql',
  'supabase/setup_admins.sql',
  // Chapter 教材
  'src/data/chapters/ch01.json',
  'src/data/chapters/ch06.json',
  'src/data/chapters/ch75.json',
];

let okFiles = 0;
let totalReplacements = 0;
let skipped = 0;

console.log(`[replace] ${FROM} → ${TO}`);
console.log(`[replace] checking ${FILES.length} files...\n`);

for (const rel of FILES) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) {
    console.log(`  ✗ MISSING:  ${rel}`);
    skipped++;
    continue;
  }
  const before = fs.readFileSync(p, 'utf8');
  const count = (before.match(/aiisland\.tw/g) || []).length;
  if (count === 0) {
    console.log(`  - no match:  ${rel}`);
    skipped++;
    continue;
  }
  const after = before.split(FROM).join(TO);
  fs.writeFileSync(p, after, 'utf8');
  console.log(`  ✓ ${rel}  (${count} replacements)`);
  okFiles++;
  totalReplacements += count;
}

console.log(`\n[replace] ${okFiles} files changed, ${totalReplacements} total replacements, ${skipped} skipped`);

// 驗證：grep 看還有沒有殘留
console.log(`\n[replace] verifying no leftover aiisland.tw in src/ + supabase/ + repo root configs...`);
function walk(dir, results = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === '.git') continue;
      walk(full, results);
    } else if (/\.(ts|tsx|js|mjs|json|sql|md|env|example)$/.test(ent.name) || ent.name === '.env.example') {
      results.push(full);
    }
  }
  return results;
}
const allFiles = [
  ...walk(path.join(REPO_ROOT, 'src')),
  ...walk(path.join(REPO_ROOT, 'supabase')),
  path.join(REPO_ROOT, 'README.md'),
  path.join(REPO_ROOT, '.env.example'),
].filter(p => fs.existsSync(p));

let remaining = 0;
const remainingFiles = new Set();
for (const f of allFiles) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const matches = content.match(/aiisland\.tw/g);
    if (matches && matches.length > 0) {
      remaining += matches.length;
      remainingFiles.add(path.relative(REPO_ROOT, f));
    }
  } catch {}
}

if (remaining === 0) {
  console.log(`[replace] ✅ ALL CLEAR — 0 leftover aiisland.tw in scanned files`);
} else {
  console.log(`[replace] ⚠️  ${remaining} leftover occurrences in ${remainingFiles.size} files:`);
  remainingFiles.forEach(f => console.log(`     - ${f}`));
}
