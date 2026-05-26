#!/usr/bin/env node
// 在 ch26.0「歡迎」之後插入 26.05「終端機 + GitHub + PowerShell 入門」
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CH_PATH = path.join(REPO_ROOT, 'src', 'data', 'chapters', 'ch26.json');

const ch = JSON.parse(fs.readFileSync(CH_PATH, 'utf8'));
const content = fs.readFileSync(path.join(__dirname, 'L05.content.md'), 'utf8');

const NEW_ID = '26.05';
const NEW_NUMBER = 'LESSON 26.0.5';
const NEW_TITLE = '終端機 + GitHub + PowerShell 入門';

const existing = ch.lessons.find(l => l.id === NEW_ID);
if (existing) {
  existing.content = content;
  existing.number = NEW_NUMBER;
  existing.title = NEW_TITLE;
  console.log('  ✓ 26.05 已存在、update content');
} else {
  const newLesson = {
    id: NEW_ID,
    number: NEW_NUMBER,
    title: NEW_TITLE,
    oneLineSummary: '不會終端機就裝不了 Python。pwd / ls / cd / git push 3 招解 80% 卡關。',
    analogy: '終端機就像「跟電腦對話的窗口」——GUI 是用滑鼠比手畫腳、終端機是直接用「電腦的語言」打字溝通。快、精準、自動化。',
    content,
    xp: 10,
    playgrounds: [
      {
        key: '26.05.git-config',
        language: 'python',
        title: '檢查環境（Python 模擬終端機指令）',
        initialCode: `# 沙盒模擬「終端機指令」效果
import os
import sys
import platform

# === 模擬 pwd ===
print("📍 pwd（當前路徑）:")
print(os.getcwd())

# === 模擬 ls ===
print("\\n📂 ls（當前資料夾內容）:")
items = os.listdir('.')[:10]
for item in items:
    print(f"  {item}")

# === 模擬 uname / Get-Host ===
print("\\n💻 系統資訊:")
print(f"  OS: {platform.system()}")
print(f"  Python: {sys.version.split()[0]}")
print(f"  Architecture: {platform.machine()}")
`,
        hint: '這是用 Python 模擬終端機操作、實際請在你的 macOS Terminal / Windows PowerShell 練習',
      }
    ],
    exercise: null,
    outline: [
      '終端機是什麼 + Mac/Windows/Linux',
      '10 個必會指令（pwd/ls/cd/mkdir/touch/cat/mv/rm/clear/Tab）',
      'PowerShell vs Mac/Linux 指令對照',
      'Git 核心 5 招（init/status/add/commit/push）',
      'GitHub 註冊 + 建 repo + push 完整流程',
      'Commit Message 慣例（Conventional Commits）',
      'PowerShell 特有功能 + 5 大新手卡關',
      '3 天 onboarding 完整流程',
    ],
  };
  // 插在 26.0 後、26.1 前
  const insertIdx = ch.lessons.findIndex(l => l.id === '26.0') + 1;
  ch.lessons.splice(insertIdx, 0, newLesson);
  console.log(`  ✓ 26.05 插入 index ${insertIdx}（26.0 後、26.1 前）`);
}

fs.writeFileSync(CH_PATH, JSON.stringify(ch, null, 2) + '\n', 'utf8');
console.log('[ch26 終端機入門] DONE、共', ch.lessons.length, '課');
