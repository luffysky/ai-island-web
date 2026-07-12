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

---

# 🌙 5/27 晚上續記（30 commit、~22:00–07:30 翌日凌晨）

林董從中午後追加大量需求、晚上總共 30 個 commit、橫跨：bot 3 通道全面美化（LINE / Telegram / Discord）+ 學員 LINE AI 灌入網站完整能力（tool use + embedding RAG + 全章節索引）+ ch28/29/30 短 analogy 友善化（57 個手寫）+ Zeabur build 紅一片修 + 5 個其他 bug。

## 晚上 Commit 列表（時間倒序）

```
38aca71  fix(analytics): 區域只顯示 TW — Zeabur 沒 Vercel headers、加 IP → city lookup
ff2a565  fix(discord): 全部 commands 改 deferred + Discord notify retry + admin 一鍵測通知
50b8a0f  feat(byok): /settings/ai-keys 入口加進 /settings 主頁 + TopNav 用戶 menu
52d8d52  fix(admin): AI key 真值測試 — /api/admin/ai/keys/test + UI「🧪 測 key」按鈕
42aca9b  content(ch28/29/30): 57 個短 analogy 全部友善化（雪鑰手寫、不靠 AI）
78a28ea  fix(notify-tg): fetch failed — 10s timeout + retry 1 次 + 帶 cause 細節
2d82939  fix(discord): cold start > 3s 解法 — GET handler 主動預熱重要 module
ec09afa  fix(build): Zeabur 60s build 超時紅一片（chapters + sitemap SSG 跑 DB）
7c2e161  fix(auth): 移除 60s 強制 getUser() 踢登出邏輯
d076665  fix: 全站低對比 text + admin auth 接受 owner role + 防 HTML 回應誤判
e1b1caa  fix(admin-ui): backfill / rewrite-lessons 按鈕文字淺色看不見
fd66fde  feat(admin): /admin/ai/rewrite-lessons UI — 批次 ch28/29/30 友善化按鈕
2487ce6  fix: LINE Flex width 漏網 + Telegram surrogate pair slice 切壞
e3fd0a7  feat(admin): rewrite-lessons API — 用 anthropic 改寫短 analogy
58e8b44  feat(playground): 支援自架 Piston（PISTON_BASE_URL env）+ 部署文件
b63e5ce  feat(discord): 全部指令 + AI 回覆 / 錯誤改 rich embed + action buttons
e661b75  feat(telegram): AI 回覆 / /help / /whoami / 錯誤改 HTML 美化卡 + inline buttons
b3da568  feat(admin): /admin/ai/embeddings 後台 + API backfill route
e6af6be  feat(line-user-ai): tool use + embedding RAG + 全 lesson 標題清單灌入
e82e36e  feat(line-admin): 所有指令回覆改 Flex 卡片
5f437d3  fix(line-admin): AI 401/錯誤改友善卡片、不再 dump raw JSON
a38b5e7  feat(line-user): AI 學員導師回覆改 Flex 卡片美化
4560d3c  feat(line-user): LINE 學員 bot = 網站 AI 導師完整能力 + 對話 DB 持久化
800510e  feat(ai+notify): AITutorWidget 加圖片上傳 + 學員通知 Flex + Discord keep-warm cron
5de6e63  feat(line/user): 學員 LINE bot 全面美化 Flex 卡 + 通知也美化
e5c1166  feat+fix: Nami AI 加截圖上傳 + 修 LINE Flex 400 + Telegram UTF-8 + DUAL 三邊通知
a7d685a  fix(notify+owner): Telegram/Discord 失敗寫 error_logs + 加 OWNER_LINE_USER_IDS env
510c107  fix(admin): 區域顯示加 district + 在線會員去重 by user_id（多裝置 1 個）
b8dda42  fix(admin/ga4): 「最新頁面停留」預設去重、每位 user 只顯示最新 1 筆
799895c  feat(admin): dashboard 加 60 秒 auto-refresh（不用手動 F5）
```

共 30 個 commit、~80 個檔案動。

加上早上 24 個 commit、**今天總計 54 個 commit**。

---

## 🤖 主軸 A：3 通道 bot 全面美化（LINE / Telegram / Discord）

### LINE admin bot
- AI 失敗 401 raw JSON 醜訊息 → `buildAIErrorCard` 紅色卡 + 提示 + 「去後台修 / 看 error log」按鈕
- 所有指令（follow / bind / unbind / clear / whoami）→ Flex 卡片（admin 紫 #bd93f9 / 成功綠 / 警告橘 / 資訊青 統一色票）
- `line-ai-tools.ts` 加 `friendlyAnthropicError()` 翻 401/429/529/404/500+ 成人話、絕不再 dump raw JSON

### LINE student bot
- 對話歷史改 DB 持久化（`ai_conversations` + `ai_messages`、`title LIKE 'LINE:%'`）— 容器重啟不失憶、admin 後台可查
- AI 學員導師回覆改 Flex 卡：短回（< 220 字、無 code）整段包 bubble、長回 / 含 code → 純文字 + 一張小 footer 卡
- 林董（owner）回覆改金色 #ffd700 header「🤖 雪鑰 · 給林董」
- `lineReply` 改支援 array messages、quickReply 自動掛最後一則
- 學員通知 Flex 化：lessonComplete / achievement / forumReply 都有 user Flex

### Telegram
- `/start /help /whoami /clear` 全 HTML 卡 + inline buttons
- AI 回覆包 footer「━━━ 🤖 model · time」+ 「📊 後台 / 🔁 切 model」buttons
- AI 失敗 `friendlyTelegramAIError()` 翻成人話 + 「🔧 去後台修 / 🛡️ 看 error log」buttons
- 修 bug: AI reply 原本 `tgSend(token, chatId, reply, msg.message_id)` 第 4 arg 是 number 但 tgSend 第 4 arg 是 options object、之前訊息 silently 丟失 replyTo

### Discord
- 全部指令（/help / /whoami / /clear / /model / /model_set）+ AI 回覆 / 錯誤改 rich embed + action buttons
- 統一色票：accent 紫 / success 綠 / error 紅 / warn 橘 / info 青 / gold 金（林董）
- AI 失敗 `friendlyDiscordAIError()` 翻成人話 + 「🔧 去後台修」按鈕
- 「未及時回應」追根 2 連修：
  - GET handler 主動預熱（ed25519 key + supabase admin + ai-crypto）
  - 全部 commands 改 deferred 策略（含 /help）、verify sig → 立刻 ACK < 50ms → background 補

---

## 🧠 主軸 B：學員 LINE AI 灌入網站完整能力（方案 1+2+3 一起做）

林董問「可以讓學員 Line AI 讀網站內容回答問題嗎」、3 方案一起上：

### 方案 1：擴 prompt（最快）
- `buildCourseSummary()` 列出全部 75 章每章 lesson 完整標題（原本只前 5）+ 每章超連結
- AI 不用 tool call 就能精準引用「Ch26 L5 講變數 → 完整在 /chapters/26」

### 方案 2：tool use（核心）
- 新增 `src/lib/line-user-ai-tools.ts`、學員專用 4 個 tools：
  - `search_lessons(query, limit)`
  - `get_lesson_content(lesson_id)`
  - `search_forum(query, limit)`
  - `get_forum_thread(thread_id)`
- `askStudentAIWithTools` — 3 輪 / 25s hard timeout
- 只給「讀網站內容」、不給「查 user / order / error」（學員權限隔離）

### 方案 3：embedding RAG
- `supabase/ai_embeddings_migration.sql`：pgvector enable + lessons / forum_threads 加 `embedding vector(1536)` 欄位
- RPC `match_lessons` / `match_forum_threads`（cosine 相似度）
- `src/lib/ai-embeddings.ts` — OpenAI text-embedding-3-small 1536 維、便宜（$0.00002/1K tokens）
- `search_lessons / search_forum` tool 先試 vector search、失敗 fallback ILIKE
- admin UI `/admin/ai/embeddings` 一鍵 backfill + 覆蓋率卡片 + 4 個按鈕（缺的 lessons / 缺的 forum / 全部缺的 / 強制重算）
- `POST /api/admin/embeddings/backfill` — admin 一鍵跑、~1-3 分鐘、~$0.015

### 整合
- `line-webhook-user/askUserAI`：Anthropic Claude 走 tool use、其他 provider 退回 callAI
- 學員 LINE bot 同等於網站 AI 導師能力

---

## 📚 主軸 C：ch28/29/30 短 analogy 友善化（57 個手寫）

3 章共 75 lesson、57 個 analogy 短於 50 字（「不存 = 浪費」、「品質 > 數量」這類 8-12 字短句）。

**做法**：寫 `scripts/rewrite-ch28-30-analogy.mjs`、雪鑰直接手寫 57 個 analogy、不靠 AI 不花 token。每個 80-150 字、日常類比起頭（廚房 / 便利商店 / 搬家 / 開瀏覽器 / 馬拉松等）。

**結果**：

| 章 | 之前 | 現在 |
|---|---|---|
| ch28 Python 爬蟲 | 6 友善 / 19 短 | **25 / 0** ✅ |
| ch29 JavaScript 爬蟲 | 6 友善 / 19 短 | **25 / 0** ✅ |
| ch30 跨語言爬蟲 | 6 友善 / 19 短 | **25 / 0** ✅ |

**範例**：
- 28.13「儲存資料」: 「不存 = 浪費」（8 字）→ 「想像你辛苦抓了 1 小時資料、結果關掉終端機全部消失—等於白做工…」（126 字）
- 30.7「語言對比」: 「不是『誰最好』、是『什麼場景用什麼』」（19 字）→ 「想像買車—家用 Toyota、跑山 Subaru、賽道 Porsche…」（138 字）

跑 `import_chapters_to_db.mjs` upsert（75 章 / 1158 lesson / 0 error）、線上 AI 導師、學員 LINE bot 都吃得到。

**ch28/29/30 共 75 lesson 全綠 25/25** ✅

---

## 🔥 主軸 D：Zeabur build 紅一片（緊急修）

林董丟 Zeabur build log：「Failed to build /chapters/X took more than 60 seconds」、ch7/8/10/11/27-33/50-57/72-74 全紅 + sitemap.xml 也超時。

**root cause**：
- `chapters/[id]/page.tsx` 有 `generateStaticParams()` 跑 `getAllChapters()`、build time 預生 75 章 SSG、每章要 fetch lessons + 算 SEO meta、超 60s 觸發 Zeabur build timeout
- `sitemap.ts` 在 build time 跑 4 個 DB query 各 5000 條 + chapters

**修法**：
- `chapters/[id]/page.tsx` 移掉 `generateStaticParams`、保留 `revalidate=60`、first request 觸發 SSG + 快取
- `sitemap.ts` 加 `export const revalidate=3600` + `dynamic=force-dynamic`
- 7 輪檢查所有 page：courses/[slug] + career/[id] 用 hardcoded array 不打 DB（OK）、admin pages 都有 auth gate 自動 dynamic（OK）

---

## 🛠️ 主軸 E：5 個其他 bug + 1 個 BYOK 入口

### 1. 全站 82 檔低對比 text（林董 33.jpg）
淺底主題 backfill 按鈕看不到字（`text-cyan-300` on `bg-cyan-500/20` 對比不足）。寫 `scripts/fix-low-contrast.mjs` codemod 自動掃替換：
- 同色 `bg-{c}-{500/15-30 + 400/10-30 + 600/10-30}` + `text-{c}-{200/300/400}` → `text-{c}-900 dark:text-{c}-{100/200}`
- 17 主色 + 5 灰色系
- 2 跑：共 230 處 / 95 檔
- 已有 `dark:text-*` 的跳過（不蓋手工調的）

### 2. 不再自動登出（林董抱怨「太快登出」）
`auth-context.tsx` 每 60s 強制 `supabase.auth.getUser()`、若 server 暫時不認就 force signOut。網路 flakey / Supabase 5xx 容易誤殺。
移除整段、走 Supabase JS SDK 自動 refresh（access token 1h + refresh token 30d）。

### 3. LINE Flex width 漏網
之前修了 5 個 width、`buildSimpleCard` header 內層 emoji box 還有 `width:"44px"` 漏掉。LINE 不支援子 box 用 width on header path。

### 4. Telegram surrogate pair slice 切壞
之前 strip surrogate 順序錯：`text.slice(0, 4000)` 切在 emoji（surrogate pair）中間留 lone surrogate。改 4 層防護：
- `stripLoneSurrogates(text)` 進函式第一件事
- `safeUtf16Slice` 退到 surrogate pair 完整邊界
- escape 後再 strip
- JSON.stringify 後最後 strip safety net

### 5. Telegram fetch failed retry
原 5s timeout 太緊、無 retry。改 10s + retry 1 次 + 帶 `cause.code` 詳細（DNS / TIMEOUT / ECONNRESET 各自不同 hint）。同樣修法套到 Discord notify。

### 6. /admin/ai/embeddings 區域只顯示 TW（林董 35.jpg）
Zeabur 不是 Vercel、`x-vercel-ip-*` headers 都沒、只剩 `cf-ipcountry`（CF Free 只給國家）。`/api/analytics/track` 加 `lookupCityByIp()` fallback：
- 用 ipwho.is（免費 10k/月、不需 key）
- memory LRU cache 24 小時、同 IP 不重打
- 失敗也 cache 避免重試燒 API

### 7. BYOK 入口（林董問「使用者貼自己的 API 在哪」）
`/settings/ai-keys` 頁面早就寫好但沒入口。加 2 條路：
- `/settings` 加紫色卡片「🔑 我的 AI API Keys（BYOK）」
- TopNav 用戶下拉 menu 加捷徑

---

## 🧪 主軸 F：新增 3 個診斷工具給林董

### `/admin/ai/keys` 加「🧪 測 key」按鈕
`GET /api/admin/ai/keys/test?provider=anthropic` — 從 DB decrypt + call provider 跑 1 個小請求驗證、回 decrypt 是否成功 / key prefix / api 真值。

```
✅ key 有效 · prefix=sk-ant-... · len=108
❌ 401 invalid x-api-key · 💡 去後台貼新 key
❌ decrypt_failed · 💡 AI_KEY_SECRET 變了、刪 row 重貼
```

### `/admin` dashboard 加「🧪 測 3 通道通知」按鈕
`POST /api/admin/notify/test` — 立刻發測試訊息到 LINE + Telegram + Discord、同時 check env 是否設好。

### `/admin/ai/rewrite-lessons` 後台 UI
觸發 batch rewrite ch28/29/30 短 analogy（雖然最後手寫了、但 UI 留著給後續其他章節用）。
按 dry-run sample 確認方向 → 按 apply 跑全部。

---

## 📈 累計進度（5/27 結算）

**新手友善化（S9 Sprint）**：
- 7 章 / 184 課完成（含 ch01 5/25）
- 6 章完整：ch26 / 27 / 28 / 29 / 30 / 46
- ch28/29/30 三章 analogy 全綠 25/25/25
- 剩 ch01 L6-L25（20 課）+ 68 章 / 974 課

**Bot 三通道全面美化**：✅ LINE / Telegram / Discord 全部指令 + AI 回覆 + 錯誤訊息 統一卡片化

**學員 LINE AI 升級為網站 AI 導師**：✅ 全章節索引 + tool use + embedding RAG（待 backfill）

**平台工程**：
- Zeabur build 不再 60s 超時 ✅
- 自動登出 bug ✅
- 全站 95 檔 contrast ✅
- BYOK 入口 ✅
- 3 個診斷工具 ✅

---

## 🎯 林董明早要做（按優先序）

### 立刻測（5-10 分鐘）
1. `/admin/ai-keys` 按「🧪 測 key」測 anthropic — 確認 LINE admin bot AI 401 真因
2. `/admin` 右上按「🧪 測 3 通道通知」— 確認 3 通道哪個 env 缺
3. 重 reload `/admin` 確認按鈕文字看得到（contrast 修了）
4. Discord 重試 `/help` — 應該秒回（deferred 修了）

### 接下來做
1. `/admin/ai/embeddings` 按「⚡ backfill 全部缺的」(~$0.015、~1-3 分鐘) — 學員 LINE AI 語意搜尋才會生效
2. `/admin/ai/rewrite-lessons` 看 ch28/29/30 已綠（手寫的、不用按）
3. Zeabur env 補：
   - `OWNER_LINE_USER_IDS=Uxxx`（綁定後 LINE 自動認林董）
   - cron-job.org 設 2-4 分鐘 ping `/api/cron/keep-warm`（已選 2 分鐘）

### 完整 backlog 看
`docs/BACKLOG.md` v6.0

---

_最後更新：2026-05-27 凌晨 by 雪鑰 · 林董去睡了、明早繼續_
