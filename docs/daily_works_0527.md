# Daily Works — 2026-05-27

雪鑰處理、董事長林董（Luffy Lin）。

## 工作主軸

承接 5/25-5/26 的 80+ commit、今天 24 個 commit、推進**新手友善化大長征**：完成 ch28-30 / ch46 / ch26 / ch01（部分）共 7 章、184 課改寫；補完整內容工程基礎建設（playground / 終端機課 / 工具課 / AI 導師 DB 化 / 誇大話術清掃）。

主要 4 條線：

1. **新手友善化爬蟲系列 ch28-30 完成 75 課**（Python 爬蟲 / JavaScript 爬蟲 / 跨語言爬蟲）
2. **ch46 AI/ML 原理 25 課完成**（林董追加章節）
3. **ch26 補完整新手 onboarding**（L0.5 終端機 + L1.5 工具 + L0-L12 補 14 個 playground）
4. **平台基礎建設**（Pyodide fallback / AI 導師 DB / 誇大話術掃 / SQL audit）
5. **ch01 HTML 系列 P0 開啟**（L1-L5 完成、剩 L6-L25）

---

## Commit 列表（時間倒序、本日全部 24 個）

```
21e47b9  docs(backlog): v5.1 整合所有待辦
7b2c326  chore(db): 跑沒跑過的 migration + audit DB schema
6ef8466  feat(ch01): batch1 改寫 L1-L5（HTML 基礎 / head / 語意化 / 文字 / 列表）
5d44a76  feat(ch26): 新增 L0.5「終端機 + GitHub + PowerShell 入門」
24e9772  docs: 新手友善化 75 章完整 BACKLOG + audit + 3 方案建議
8631e5f  chore(content): 掃 + 修速成誇大話術（ch26 / ch27 秒上手）
1c71b4d  feat(ch26): 補 L0-L12 playground（13 課缺 / L1-L5 fibonacci 重複範例修正）
6993064  fix(ch26): 修正 L1.5 誤覆蓋 + 復原 26.15 Matplotlib
9135cfa  feat(ch26): 新增 L1.5「編輯器 + Jupyter + Colab 工具大全」
692b506  feat(ai-tutor): system prompt 從 DB 即時讀章節（不再 build-time 寫死）
a48f331  feat(ch46): batch6 改寫 L21-L25 完結（開源部署 + 成本 + 多模態 + Eval + 倫理）
ee928ab  feat(ch46): batch5 改寫 L17-L20（LangChain + Vercel AI SDK + LlamaIndex + Fine-tune vs RAG）
290b582  feat(ch46): batch4 改寫 L13-L16（RAG + Embedding + 向量 DB + Agent）
0252897  feat(ch46): batch3 改寫 L9-L12（Few-shot/CoT/ReAct + Tool Use + 結構化輸出 + Streaming）
4284eba  feat(ch46): batch2 改寫 L5-L8（LLM 運作 + 模型地圖 + Token 價格 + Prompt 入門）
6ac25e2  fix(playground): TS type error、lang state 改寬成 string
ed3b979  feat(ch46): batch1 改寫 L1-L4（AI 名詞 + ML 三類 + 神經網路 + Transformer）
8038571  feat(ch30): batch6 改寫 L22-L25 完結（儲存策略 + 客戶交付 + 學習路徑 + 心法）
780abe0  feat(ch30): batch5 改寫 L18-L21（反指紋進階 + Browser Cluster + 資料品質 + ETL）
d68a667  fix(playground): Python 改用 Pyodide 瀏覽器內跑、Piston 掛了也能用
fb9c75e  feat(ch30): batch4 改寫 L14-L17（AI 爬蟲 Py + OCR Py + Streaming + 分散式）
26f5a58  feat(ch30): batch3 改寫 L9-L13（Rust 精華 + Java/Kotlin + PHP/Ruby + cURL + Sheets）
6c07851  feat(ch30): batch2 改寫 L5-L8（分散式 + 千萬規模架構 + 語言對比 + Go 精華）
56f5f69  feat(ch30): batch1 改寫 L1-L4（跨語言選擇 + Go colly + Rust + 排程）
```

24 個 commit、~50 個檔案改 / 新增。

---

## 1️⃣ ch28-30 爬蟲系列完整新手友善化（75 課）

**ch28 Python 爬蟲（25 課）昨晚收尾 + 今天完結驗收**

**ch29 JavaScript 爬蟲（25 課）**：
- L1-L3 Node vs Python / fetch+cheerio / Puppeteer
- L4-L7 Playwright / Crawlee / 蝦皮實戰 / fetch 進階
- L8-L11 Playwright Test / Puppeteer CDP / Crawlee 進階 / Bun runtime
- L12-L16 Network 攔截 / CF Workers / 反指紋 / TLS / RSS
- L17-L21 Apify / TS / 監控告警 / Vercel Functions / Scraping APIs
- L22-L25 蝦皮比價 SaaS 完整實戰 / AI 爬蟲 / OCR / 學習路徑

**ch30 跨語言爬蟲（25 課）**：
- L1-L4 跨語言選擇 + Go colly + Rust + 排程
- L5-L8 分散式 + 千萬規模架構 + 語言對比 + Go 精華
- L9-L13 Rust 精華 + Java/Kotlin + PHP/Ruby + cURL + Excel/Sheets
- L14-L17 AI 爬蟲 Python + OCR + Streaming + 分散式
- L18-L21 反指紋進階 + Browser Cluster + 資料品質 + ETL Pipeline
- L22-L25 儲存策略 + 客戶交付 + 學習路徑 + 終極心法

每課改寫遵守 3 大規則：
1. 英文術語首次出現用「English (中文) — 白話一句」
2. 4 個 emoji 區塊標籤（📄 寫進程式檔 / 🖥️ 在終端機輸入 / ⌨️ 這時換你打字 / 💬 電腦會顯示）
3. 終端機指令逐行白話解釋

---

## 2️⃣ ch46 AI/ML 原理（25 課、林董追加）

L1 AI/ML/DL/GenAI 名詞釐清 → L25 AI 倫理與偏見、覆蓋整個 LLM 應用工程：
- **基礎**：神經網路 / Transformer / Scaling Laws / 模型地圖
- **API 應用**：Token 計費 / Prompt Engineering / Few-shot / CoT / ReAct
- **工程化**：Function Calling / 結構化輸出 / Streaming / RAG / Embedding / 向量 DB / Agent 架構
- **框架**：LangChain / Vercel AI SDK / LlamaIndex / Fine-tune vs RAG
- **進階**：開源部署 / 成本控制 / 多模態 / Eval / 倫理

修掉誤植段：所有 ch46 lesson 結尾的「🛠️ 工具推薦」「⚠️ 新手常見錯誤」「⚡ 學習加速器」前端誤植段全刪。

---

## 3️⃣ ch26 補完整新手 onboarding

**新加 2 課**：
- `26.05` **終端機 + GitHub + PowerShell 入門**（插在 26.0 歡迎後 / 26.1 Python 安裝前）
  - 10 個必會指令（pwd/ls/cd/mkdir 等）
  - PowerShell vs Mac/Linux 對照
  - Git 5 招 + GitHub 註冊 + push 完整流程
  - Conventional Commits 慣例
  - 5 大新手卡關 + 3 天 onboarding 流程
- `26.1.5` **編輯器 + Jupyter + Colab 工具大全**
  - 4 大寫 Python 方式
  - VS Code 安裝 + 5 必裝擴充
  - Cursor + PyCharm + Jupyter + Colab + REPL/IPython
  - 2026 黃金組合（Cursor + uv + Jupyter + Colab）

**補 14 個 playground**（task #19）：
- L0-L12 13 課之前缺 playground 或共用 fibonacci 重複範例
- 全寫對應該課主題的範例（變數 / 容器 / 流程 / 函數 / OOP / Type Hints 等）
- 9 added + 5 updated
- 加上 Pyodide fallback、全 Python playground 瀏覽器內可跑

ch26 現在 35 課：26.0 歡迎 → 26.05 終端機 → 26.1 uv 安裝 → 26.1.5 編輯器 → 26.2-26.32 課程。

---

## 4️⃣ 平台基礎建設（4 項）

### A. Pyodide fallback（playground 救命）

林董看到 Piston 掛了後的「沙盒服務暫時無法使用」訊息、問是不是要 API。答：不要、Piston 是免費社群服務、會偶爾掛 1-2 小時。

修法：
- `PlaygroundCard.tsx` 加 `isPython` 判斷
- Python code 優先用 `usePyodide` hook（瀏覽器內 Pyodide）
- Pyodide 載入失敗才 fallback 到 Piston（`runViaSandbox`）
- 輸出區顯示「🐍 瀏覽器內 Pyodide」標籤
- 其他語言（Go / Rust / Java / TS 等）仍走 Piston

效果：Python playground 0 月費、永遠可用。其他語言要自架 Piston（task #24、要月費）。

### B. AI 導師從 DB 即時讀章節（task #20）

問題：
- `ai-tutor-prompt.ts` 從 `@/data/chapters` build-time 載入
- 章節 JSON 改了 / DB 改了、AI 導師永遠看舊內容
- 跟 ISR 頁面不一致（user 看 v2、AI 看 v1）
- module-level `cachedCourseSummary` 永遠不更新

修法：
- 改成從 Supabase `chapters` / `lessons` 表讀
- `unstable_cache` 5 分鐘 cache 章節 summary
- `unstable_cache` 60 秒 cache 單 lesson 完整內容
- `buildTutorSystemPrompt` 改 async
- `/api/ai/chat` call 加 await

效果：JSON 改 → 跑 import → 5 分鐘內 AI 看到新內容。

### C. 誇大話術掃 + 修（task #9）

寫 `scripts/scan_overclaim.mjs`、掃全 75 章誇大話術 4 類：
- 🔴 嚴重「保證找工作 / 上班」：2 處 → 都是 false positive
- 🟡 速成「秒會 / X 秒上手」：5 處 → 改 2 個（ch26.2「30 秒上手」/ ch27.2「5 秒上手」）
- 🟠 履歷面試話術：0 處（沒寫過）
- 🟢 收入承諾：20 處 → 大部分是「可能達到 / 目標 / 路線」、保留

整份 audit 結果存 `scripts/_overclaim_report.json`、之後可重跑。

### D. SQL migration audit（林董問「sql 還沒跑」）

跑 5 個 migration（全 IF NOT EXISTS 冪等）：
- comment_likes_migration → blog_comment_likes / forum_reply_likes
- geo_consent_migration → profiles alter
- interaction_analytics_migration → analytics_sessions / page_views / events
- blog_migration → user_blog_articles 等
- future_schemas_migration → user_reports / web_vitals / email_campaigns

audit 結論：DB schema 健康（107 表）、check-all-tables 顯示「缺 10 表」其實是 EXPECTED 清單過時、實際都用新表名存在：
- rate_limits → rate_limit_hits + rate_limit_rules
- blog_posts → user_blog_articles
- comment_likes → blog_comment_likes / forum_reply_likes
- subscribers → blog_subscribers / email_subscribers
- 等等

寫 `scripts/run-missing-migrations.mjs` 給以後用。

---

## 5️⃣ ch01 HTML P0 開啟（5/25 課）

按方案 C 推進、開始 P0 前端基礎：

**ch01 L1-L5 完成**：
- L1 HTML 是什麼（883 → 7K chars）
- L2 head 區塊（1075 → 8K chars）
- L3 語意化標籤（958 → 8K chars）
- L4 文字標籤完整（831 → 7K chars）
- L5 列表三兄弟（548 → 7K chars）

每課含：4 emoji block + 終端機指令逐行解釋 + ☕ 用人話講總結 + 💼 接案小知識。

**剩 ch01**：L6-L25（20 課、4-5 batch）。

---

## 6️⃣ 林董答疑

### 「即時在線真的即時嗎？準嗎？」

機制：
- 每訪客 mount `InteractionTracker`、每 15 秒 heartbeat 一次
- Dashboard 查 `analytics_sessions.last_seen_at >= 5 分鐘前` = 在線
- 區分會員（user_id 有）/ 訪客（user_id null）

評估：**真的即時、5 分鐘窗口 + 15 秒 heartbeat、約 85-95% 準度**。

### 「還有其他數據」

Dashboard 已有：即時在線 / 本月新註冊 / DAU / MRR / 訂單 / 訂閱 / AI 用量 / 預算進度 / 收入趨勢 / 章節完成 Top 10 / 每小時活躍 / UTM / 緊急 breach / audit log。完整在 `/admin`、`/admin/ga4`、`/admin/kpi`。

---

## 📊 累計進度

**新手友善化（S9 Sprint）**：
- 7 章 / 184 課完成（8% → 12% 進度）
- 6 章完整：ch26 / 27 / 28 / 29 / 30 / 46
- 1 章進行：ch01（5/25）
- 剩 68 章 / 974 課

**平台工程**：
- AI 導師 DB 化 ✅
- Pyodide fallback ✅
- Playground L0-L12 補齊 ✅
- 終端機入門課 + 工具課 ✅
- 誇大話術 audit + 修 ✅
- SQL migration audit ✅

---

## 🎯 明天 / 本週繼續

按 BACKLOG.md v5.1「下一步建議」：

### 主菜
- ch01 batch2 L6-L11（HTML 連結 + 表格 + 表單 + SEO + JSON-LD + a11y）
- ch01 batch3-5 完結
- ch02 CSS 完整 25 課

### 待林董決策
- 充 Replicate $10（AI OG 最後一塊）
- 修 LINE admin bot AI
- 自架 Piston（task B-4、月費 NT$ 150-600）

### 林董 blocked 實機測（11 項一起跑）

---

_最後更新：2026-05-27 by 雪鑰_
