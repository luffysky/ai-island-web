#!/usr/bin/env node
// 修正：上次誤用 26.15 ID 覆蓋了既有「Matplotlib / Seaborn / Plotly：視覺化」
// 現在：(1) 復原 26.15 為 Matplotlib (2) 新 lesson 用 26.1.5 ID 插在 26.1 後
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch26.json');

const ch = JSON.parse(fs.readFileSync(CH_PATH, 'utf8'));
const newContent = fs.readFileSync(path.join(__dirname, 'L15.content.md'), 'utf8');
const old26_15 = JSON.parse(fs.readFileSync(path.join(__dirname, '_old-26.15.json'), 'utf8'));

// === Step 1：復原 26.15 為原本的 Matplotlib lesson ===
const idx15 = ch.lessons.findIndex(l => l.id === '26.15');
if (idx15 >= 0) {
  ch.lessons[idx15] = old26_15;
  console.log('  ✓ 復原 26.15 =', old26_15.title);
}

// === Step 2：新 tools lesson 用 26.1.5（不衝突）===
// 用 ID 「26.1.5」、放在 26.1 後 / 26.2 前
const NEW_ID = '26.1.5';
const NEW_NUMBER = 'LESSON 26.1.5';
const NEW_TITLE = '編輯器 + Jupyter + Colab 工具大全';

const existing = ch.lessons.find(l => l.id === NEW_ID);
if (existing) {
  existing.content = newContent;
  existing.number = NEW_NUMBER;
  existing.title = NEW_TITLE;
  console.log('  ✓ 26.1.5 已存在、update content');
} else {
  const newLesson = {
    id: NEW_ID,
    number: NEW_NUMBER,
    title: NEW_TITLE,
    oneLineSummary: '裝完 Python 後在哪寫 code？VS Code / Cursor / Jupyter / Colab / REPL 完整指南。',
    analogy: '就像買了食材要選廚房——編輯器 = 一般廚房、Jupyter = 開放式廚房（邊煮邊試吃）、Colab = 雲端共用廚房（免費食材庫）、REPL = 立飲區（站著快速吃）。',
    content: newContent,
    xp: 10,
    playgrounds: [],
    exercise: null,
    outline: [
      '4 大寫 Python 方式對比',
      'VS Code 安裝 + 5 大必裝擴充',
      'Cursor：AI 寫程式神器',
      'Jupyter Notebook 互動筆記本',
      'Google Colab 雲端免費 GPU',
      'REPL / IPython 快速試 code',
      '2026 黃金組合 + 常見坑',
    ],
  };
  const insertIdx = ch.lessons.findIndex(l => l.id === '26.1') + 1;
  ch.lessons.splice(insertIdx, 0, newLesson);
  console.log(`  ✓ 26.1.5 插入 index ${insertIdx}（L1 後、L2 前）`);
}

fs.writeFileSync(CH_PATH, JSON.stringify(ch, null, 2) + '\n', 'utf8');
console.log('[ch26 L1.5] DONE、共', ch.lessons.length, '課');
