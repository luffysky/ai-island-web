# AI 島 — 全專案待辦（2026-06-23 更新）

## ✅ 課程沙盒 / 終端機（Wandbox + Judge0 + 可選 Piston）
- [x] 沙盒後端鏈：Piston(自架,選配) → Judge0(設 key) → Wandbox(免費墊底)、依序退避。
- [x] 虛擬終端機：所有 playground + admin Nami 練習場都有（Python=Pyodide REPL、Shell=沙盒）。
- [x] C# 中文輸出修正（注入 UTF-8 writer）；沙盒檔名輸入（Java 自動對齊 class 名）。
- [x] Wandbox compiler id 每月自動更新（scripts/update-wandbox-compilers.mjs + GH Action）。
- [ ] （選配）自架 Piston 加速：Zeabur 跑不起來(需特權)、要用 VPS。設 `PISTON_BASE_URL`。

## ✅ 部落格
- [x] 文章可自訂 slug（編輯器 slug 欄、未改前跟標題自動產生）。
- [x] 編輯器支援上傳影片/音樂、文章內直接播放（+ 圖片本就有）。
- [x] blog_slug / 文章 slug 查詢大小寫不敏感（修 404）。

## 🟠 技術債 / 健壯性
- [ ] **`providerFromModel` 去重**：8 個檔各自定義；summarize-memories / inactive-user-recall /
      resources-recommend / subscription-recommend / kanban-auto-sync / kanban-ai-add /
      line-bot-commands / discord-interactions **寫死打 api.anthropic.com**。應抽共用
      `resolveUsageAI(usageKey)` 回 {model, provider, key} 並統一走 `callAI`，避免「admin 改用途模型→
      非 anthropic→404」再發生。（已用「admin_assistant 改回 anthropic」止血。）
- [ ] **AI 草稿人工抽查**：80 章 metadata / 1238 miniQuiz（尤其答案）/ 補厚章技術正確性。
- [ ] **章節「掌握度」串進度條**：lesson_engagement（scroll/dwell/quiz/playground）餵章節進度 / 推薦複習。
- [ ] **ch46.json 教學內容**：model-routing 範例還寫 `gemini-2.0-flash`（已下架）→ 更新成 2.5-flash（純教學、低優先）。
- [ ] **R2 大檔上傳**：影片走 server route 過記憶體、>50MB 不行。要更大改 presigned 直傳 R2。

## 🟡 增強 / 之後（既有清單）
- [ ] **接 OpenRouter（免費模型）**：一把 key 拿 DeepSeek R1 / Llama 等 `:free`。見 docs/free_ai_apis.md。
- [ ] **PWA icon**：補 PNG 192/512 maskable。
- [ ] **leetcode 題庫**：目前 50 題、`node scripts/seed-leetcode-questions.mjs --limit 300` 加量。
- [ ] **GDPR `user_settings`**：表不存在、gdpr/export 默默漏掉。建表 or 刪那行。

## 🚀 可以再升級的方向（2026-06-23 新增）
- [ ] **沙盒/終端 stdin 互動**：目前單次執行。可加「輸入區」讓需要 input() 的程式能餵資料。
- [ ] **部落格留言/反應/TOC/閱讀進度**：insight-engine 都有、可移植（reactions 表 + 留言 + 目錄 + 進度條）。
- [ ] **部落格系列(series) UI 強化**：欄位已有、編輯器可做更完整的系列管理 + 上一篇/下一篇。
- [ ] **YouTube/Vimeo 內嵌鈕**：sanitizer 已放行 iframe 白名單、再加編輯器一顆「嵌入影片連結」鈕即可。
- [ ] **學習進度儀表板**：把 lesson_engagement + reading_position 做成「我的學習」總覽圖表。
- [ ] **每日測驗難度自適應**：依答對率動態調題目難度（已有 elo 欄位可用）。
- [ ] **AI 導師串課程上下文**：綠寶回答時自動帶「目前章節 + 你的掌握度」當 context。
- [ ] **沙盒輸出圖表**：Python playground 已支援 matplotlib PNG、可擴到前端 chart。
- [ ] **離線 PWA 章節快取**：Service Worker 快取已讀章節、地鐵也能看。
- [ ] **e2e 煙霧測試**：site-audit 是 ping、可加 Playwright 對關鍵流程（登入/發文/跑沙盒）做煙霧測試。

> 完整脈絡見 docs/daily_works_*.md。
