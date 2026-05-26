#!/usr/bin/env node
// 掃描所有 chapter JSON、找誇大話術 + 上下文、輸出 report
// 林董 review report 後決定哪些要改

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(ROOT, 'src/data/chapters');

// 誇大話術正則（依嚴重度分類）
const PATTERNS = {
  '🔴 嚴重 - 保證上班 / 找工作': [
    /學完.*能.*面試/,
    /學完.*能.*上班/,
    /學完.*能.*工作/,
    /拿去上班/,
    /拿來上班/,
    /準備好上班/,
    /保證.*工作/,
    /保證.*面試/,
    /保證.*錄取/,
    /保證.*接案/,
    /保證.*賺/,
    /面試.*穩過/,
    /面試.*穩.*\u0/, // 「面試穩」結尾
  ],
  '🟡 中等 - 速成 / 秒會': [
    /秒學會/,
    /秒上手/,
    /1 天學會/,
    /3 天學會/,
    /1 週學會/,
    /\d+ 天.*成為.*工程師/,
    /\d+ 週.*成為.*工程師/,
    /\d+ 個月.*成為.*工程師/,
    /\d+ 個月.*成為.*senior/i,
    /\d+ 個月.*專業/,
    /\d+ 個月.*資深/,
    /速成/,
    /輕鬆.*年薪/,
    /輕鬆.*月薪/,
    /躺著賺/,
  ],
  '🟠 中等 - 履歷面試話術': [
    /面試官.*愛/,
    /履歷.*神器/,
    /履歷.*加分.*神/,
    /面試.*神兵利器/,
    /面試.*必殺/,
    /拿這個.*面試/,
  ],
  '🟢 提醒 - 收入承諾（事實 / 範圍 OK、但要看上下文）': [
    /月入.*\$\d{4,}/,
    /年收.*\$\d{4,}/,
    /MRR.*\$\d{4,}/,
    /輕鬆達到/,
    /不費力/,
  ],
};

const files = fs.readdirSync(CHAPTERS_DIR).filter(f => f.endsWith('.json')).sort();
console.log(`📚 掃描 ${files.length} 個 chapter\n`);

let totalHits = 0;
const reportByLevel = {};

for (const file of files) {
  const ch = JSON.parse(fs.readFileSync(path.join(CHAPTERS_DIR, file), 'utf8'));
  for (const lesson of ch.lessons || []) {
    const content = lesson.content || '';
    if (!content) continue;

    for (const [level, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        const matches = [...content.matchAll(new RegExp(pattern.source, 'g'))];
        for (const m of matches) {
          const idx = m.index;
          const start = Math.max(0, idx - 30);
          const end = Math.min(content.length, idx + m[0].length + 30);
          const context = content.slice(start, end).replace(/\n+/g, ' / ');

          reportByLevel[level] ??= [];
          reportByLevel[level].push({
            file: file.replace('.json', ''),
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            match: m[0],
            context: `...${context}...`,
          });
          totalHits++;
        }
      }
    }
  }
}

// 印 report
for (const [level, hits] of Object.entries(reportByLevel)) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${level}（${hits.length} 處）`);
  console.log('='.repeat(70));

  // 依 lesson 分組
  const byLesson = new Map();
  for (const h of hits) {
    const key = `${h.file} ${h.lessonId} ${h.lessonTitle}`;
    if (!byLesson.has(key)) byLesson.set(key, []);
    byLesson.get(key).push(h);
  }

  for (const [key, items] of byLesson) {
    console.log(`\n📖 ${key}`);
    for (const item of items.slice(0, 3)) { // 每個 lesson 印前 3 個
      console.log(`   🔍 "${item.match}"`);
      console.log(`      → ${item.context}`);
    }
    if (items.length > 3) console.log(`   ... 還有 ${items.length - 3} 個 match`);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`📊 總計：${totalHits} 處可能誇大、分布在 ${Object.values(reportByLevel).flat().reduce((s, h) => s.add(h.file), new Set()).size} 個檔案`);
console.log('='.repeat(70));

// 存 JSON 給後續 codemod 用
fs.writeFileSync(
  path.join(__dirname, '_overclaim_report.json'),
  JSON.stringify(reportByLevel, null, 2),
  'utf8'
);
console.log(`\n💾 完整 report 存 scripts/_overclaim_report.json`);
