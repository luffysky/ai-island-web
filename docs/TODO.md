# AI 島 — 全專案待辦（2026-06-19 整理）

## ✅ 課程沙盒 / 終端機（已修，Wandbox 免費後端）
- [x] **沙盒改用 Wandbox**（免費、免 key）為預設執行後端 → C#/Go/Rust/Java… 立即可跑。
- [x] **虛擬終端機**：所有 playground 加「終端機」鈕。Python=瀏覽器內 Pyodide REPL（變數持久）、其他=Wandbox。
- [ ] **（選配）自架 Piston 加速**：設 `PISTON_BASE_URL` 後優先用 Piston、失敗自動退 Wandbox。量大/要更快再做（見 docs/piston-selfhost.md）。
- [ ] **Wandbox 版本維護**：route 內 `WANDBOX_COMPILER` 的 compiler id 偶爾要更新（從 wandbox.org/api/list.json 對）。

## 🔴 需林董決策 / 需 infra
- [ ] **Zeabur runtime env 檢查**：`R2_*`（已確認在）、`DISCORD_OWNER_USER_IDS`、各家 AI key。Wandbox 免設定。
- [ ] **GDPR `user_settings`**：表不存在、gdpr/export 默默漏掉這塊。建表 or 刪那行。

## 🟠 技術債 / 健壯性
- [ ] **`providerFromModel` 去重**：8 個檔各自定義；且 summarize-memories / inactive-user-recall / resources-recommend / subscription-recommend / kanban-auto-sync / kanban-ai-add / line-bot-commands / discord-interactions **寫死打 api.anthropic.com**。應抽共用 `resolveUsageAI(usageKey)` 回 {model, provider, key} 並統一走 `callAI`，避免「admin 改用途模型→非 anthropic→404」再發生。（這次已用「admin_assistant 改回 anthropic」止血。）
- [ ] **AI 草稿人工抽查**：80 章 metadata / 1238 miniQuiz（尤其答案）/ 補厚章技術正確性。
- [ ] **章節「掌握度」串進度條**：lesson_engagement（scroll/dwell/quiz/playground）可餵章節進度 / 推薦複習。

## 🟡 增強 / 之後
- [ ] **接 OpenRouter（免費模型）**：一把 key 拿 DeepSeek R1 / Llama 等 `:free`。見 docs/free_ai_apis.md。CP 值最高。
- [ ] **PWA icon**：補 PNG 192/512 maskable。
- [ ] **leetcode 題庫**：目前 50 題、要更多 `node scripts/seed-leetcode-questions.mjs --limit 300`。
- [ ] **gemini-2.0-flash row** 已設 inactive；確認沒有別處 hard-code 它。

## ✅ 本輪已完成（2026-06-19）
- bug95 章節吹牛文案；綠寶 maxTokens 8192 +「繼續回答」鈕；部落格 404（slug 大小寫）+ 查看連結；
  Telegram/後台 AI 404（admin_assistant 改回 anthropic）；embedding 模型修正；
  AI 模型清單下架 gemini2.0 + 擴充到 22 個（admin on/off）；R2 next/image domain；沙盒白名單錯誤訊息；free_ai_apis.md。

> 完整脈絡見 docs/daily_works_0619.md。
