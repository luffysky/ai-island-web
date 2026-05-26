#!/usr/bin/env node
// One-shot script: 套用 Ch26 batch1 改寫（L0 新增 + L1, L2 改寫）
// 規格：docs/ch26_beginner_friendly_spec_v0 (1).md
// 用法：node scripts/_oneshot-ch26-batch1/apply.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH26_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch26.json');

console.log('[ch26-batch1] reading:', CH26_PATH);
const raw = fs.readFileSync(CH26_PATH, 'utf8');
const ch26 = JSON.parse(raw);

console.log('[ch26-batch1] original lessons:', ch26.lessons.length);

const L0_CONTENT = fs.readFileSync(path.join(__dirname, 'L0.content.md'), 'utf8');
const L1_CONTENT = fs.readFileSync(path.join(__dirname, 'L1.content.md'), 'utf8');
const L2_CONTENT = fs.readFileSync(path.join(__dirname, 'L2.content.md'), 'utf8');

// === 新增 L0：環境預備課 ===
const L0 = {
  id: '26.0',
  number: 'LESSON 26.0',
  title: '開始之前 — 你需要知道的 5 件事',
  oneLineSummary: '第一次碰程式？先認識「終端機、程式檔、寫 vs 執行、教材的四種標示」——後面 32 課才不會卡。',
  analogy: '學煮飯之前、要先認識廚房裡的爐子、刀、食譜長什麼樣。學程式也一樣——在動手寫第一個 print 之前、要先知道「程式寫在哪裡、怎麼讓電腦跑起來、那個黑視窗叫什麼」。',
  content: L0_CONTENT,
  tip: {
    type: 'practical',
    text: '不需要把這 5 件事全記下來、後面的課會反覆出現。這課的目的是建立「地圖感」、不是考試。看一次有印象就行、之後遇到再回來查。',
  },
  xp: 10,
  exercise: {
    question: '打開你電腦上的終端機（Windows 按 Win 鍵打 cmd 或 PowerShell、Mac 按 Cmd+空白打 Terminal）、在裡面打 `python --version` 按 Enter、把你看到的結果用一句話寫下來。',
    hint: '兩種可能結果：(1) 看到「Python 3.x.x」這種版本號 = 你電腦已經裝好 Python、可以直接進 L1。(2) 看到「找不到指令」或「command not found」之類錯誤 = 還沒裝、L1 會教安裝。',
    answer: '兩種結果都是「正確答案」——重點不是版本號、是你成功做到了「打開終端機 + 在裡面下指令 + 看到電腦回應」這 3 個動作。這就是寫程式 90% 的時間在做的事。',
  },
  outline: [
    { level: 3, text: '1. 什麼是「終端機」（Terminal）？' },
    { level: 3, text: '2. 什麼是「程式檔」？' },
    { level: 3, text: '3. 「寫程式」和「執行程式」是兩件事' },
    { level: 3, text: '4. 教材的四種區塊標示（之後會一直看到）' },
    { level: 3, text: '5. 遇到看不懂的英文術語怎麼辦？' },
  ],
};

// 插在最前面（id 26.0、不動其他 lesson 的 id / number）
if (ch26.lessons[0]?.id === '26.0') {
  console.log('[ch26-batch1] L0 already exists — replacing in place');
  ch26.lessons[0] = L0;
} else {
  ch26.lessons.unshift(L0);
  console.log('[ch26-batch1] L0 prepended');
}

// === 改寫 L1 content ===
const L1 = ch26.lessons.find((l) => l.id === '26.1');
if (!L1) throw new Error('L1 (26.1) not found');
L1.content = L1_CONTENT;
console.log('[ch26-batch1] L1 content updated, new length:', L1.content.length);

// === 改寫 L2 content ===
const L2 = ch26.lessons.find((l) => l.id === '26.2');
if (!L2) throw new Error('L2 (26.2) not found');
L2.content = L2_CONTENT;
console.log('[ch26-batch1] L2 content updated, new length:', L2.content.length);

// === batch2: L3, L4, L5, L6 改寫 ===
const L3_CONTENT = fs.readFileSync(path.join(__dirname, 'L3.content.md'), 'utf8');
const L4_CONTENT = fs.readFileSync(path.join(__dirname, 'L4.content.md'), 'utf8');
const L5_CONTENT = fs.readFileSync(path.join(__dirname, 'L5.content.md'), 'utf8');
const L6_CONTENT = fs.readFileSync(path.join(__dirname, 'L6.content.md'), 'utf8');

const L3 = ch26.lessons.find((l) => l.id === '26.3');
if (!L3) throw new Error('L3 (26.3) not found');
L3.content = L3_CONTENT;
console.log('[batch2] L3 content updated, new length:', L3.content.length);

const L4 = ch26.lessons.find((l) => l.id === '26.4');
if (!L4) throw new Error('L4 (26.4) not found');
L4.content = L4_CONTENT;
// 修 L4 原本 oneLineSummary / analogy 被誤植成 L2 字串操作課的內容
L4.oneLineSummary = 'Python 4 個內建容器：list / tuple / set / dict——學熟就組合解 90% 資料問題。';
L4.analogy = '像 4 種不同的收納盒——list 是可以重新排列的書架（有順序、可加減）、tuple 是封口的禮物盒（固定不能改）、set 是抽屜（隨手丟、不重複）、dict 是貼標籤的便當盒（用名字找東西）。';
console.log('[batch2] L4 content + oneLineSummary + analogy updated, new length:', L4.content.length);

const L5 = ch26.lessons.find((l) => l.id === '26.5');
if (!L5) throw new Error('L5 (26.5) not found');
L5.content = L5_CONTENT;
console.log('[batch2] L5 content updated, new length:', L5.content.length);

const L6 = ch26.lessons.find((l) => l.id === '26.6');
if (!L6) throw new Error('L6 (26.6) not found');
L6.content = L6_CONTENT;
console.log('[batch2] L6 content updated, new length:', L6.content.length);

// === batch3: L7-L12 改寫 ===
const L7_CONTENT = fs.readFileSync(path.join(__dirname, 'L7.content.md'), 'utf8');
const L8_CONTENT = fs.readFileSync(path.join(__dirname, 'L8.content.md'), 'utf8');
const L9_CONTENT = fs.readFileSync(path.join(__dirname, 'L9.content.md'), 'utf8');
const L10_CONTENT = fs.readFileSync(path.join(__dirname, 'L10.content.md'), 'utf8');
const L11_CONTENT = fs.readFileSync(path.join(__dirname, 'L11.content.md'), 'utf8');
const L12_CONTENT = fs.readFileSync(path.join(__dirname, 'L12.content.md'), 'utf8');

for (const [id, content] of [
  ['26.7', L7_CONTENT],
  ['26.8', L8_CONTENT],
  ['26.9', L9_CONTENT],
  ['26.10', L10_CONTENT],
  ['26.11', L11_CONTENT],
  ['26.12', L12_CONTENT],
]) {
  const l = ch26.lessons.find((x) => x.id === id);
  if (!l) throw new Error(`${id} not found`);
  l.content = content;
  console.log(`[batch3] ${id} (${l.title}) updated, new length:`, l.content.length);
}

// === batch4 part A: L13, L14, L15 (NumPy / Pandas / 視覺化) ===
const L13_CONTENT = fs.readFileSync(path.join(__dirname, 'L13.content.md'), 'utf8');
const L14_CONTENT = fs.readFileSync(path.join(__dirname, 'L14.content.md'), 'utf8');
const L15_CONTENT = fs.readFileSync(path.join(__dirname, 'L15.content.md'), 'utf8');

for (const [id, content] of [
  ['26.13', L13_CONTENT],
  ['26.14', L14_CONTENT],
  ['26.15', L15_CONTENT],
]) {
  const l = ch26.lessons.find((x) => x.id === id);
  if (!l) throw new Error(`${id} not found`);
  l.content = content;
  console.log(`[batch4a] ${id} (${l.title}) updated, new length:`, l.content.length);
}

// === batch4 part B: L16-L20 (ML 基礎) ===
const L16_CONTENT = fs.readFileSync(path.join(__dirname, 'L16.content.md'), 'utf8');
const L17_CONTENT = fs.readFileSync(path.join(__dirname, 'L17.content.md'), 'utf8');
const L18_CONTENT = fs.readFileSync(path.join(__dirname, 'L18.content.md'), 'utf8');
const L19_CONTENT = fs.readFileSync(path.join(__dirname, 'L19.content.md'), 'utf8');
const L20_CONTENT = fs.readFileSync(path.join(__dirname, 'L20.content.md'), 'utf8');

for (const [id, content] of [
  ['26.16', L16_CONTENT],
  ['26.17', L17_CONTENT],
  ['26.18', L18_CONTENT],
  ['26.19', L19_CONTENT],
  ['26.20', L20_CONTENT],
]) {
  const l = ch26.lessons.find((x) => x.id === id);
  if (!l) throw new Error(`${id} not found`);
  l.content = content;
  console.log(`[batch4b] ${id} (${l.title}) updated, new length:`, l.content.length);
}

// === batch5 part A: L21, L22, L23 (DL 基礎 + PyTorch + 3 大架構) ===
const L21_CONTENT = fs.readFileSync(path.join(__dirname, 'L21.content.md'), 'utf8');
const L22_CONTENT = fs.readFileSync(path.join(__dirname, 'L22.content.md'), 'utf8');
const L23_CONTENT = fs.readFileSync(path.join(__dirname, 'L23.content.md'), 'utf8');

for (const [id, content] of [
  ['26.21', L21_CONTENT],
  ['26.22', L22_CONTENT],
  ['26.23', L23_CONTENT],
]) {
  const l = ch26.lessons.find((x) => x.id === id);
  if (!l) throw new Error(`${id} not found`);
  l.content = content;
  console.log(`[batch5a] ${id} (${l.title}) updated, new length:`, l.content.length);
}

// === 寫回 + 驗證 ===
const out = JSON.stringify(ch26, null, 2) + '\n';
fs.writeFileSync(CH26_PATH, out, 'utf8');
console.log('[ch26-batch1] wrote ch26.json,', out.length, 'bytes');

const verify = JSON.parse(fs.readFileSync(CH26_PATH, 'utf8'));
console.log('[ch26-batch1] verify: total lessons =', verify.lessons.length);
console.log('[ch26-batch1] verify: first 3 =',
  verify.lessons.slice(0, 3).map((l) => `${l.id} ${l.title}`).join(' | '));

console.log('[ch26-batch1] DONE ✅');
