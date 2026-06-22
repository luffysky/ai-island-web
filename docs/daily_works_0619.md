# Daily Works — 2026-06-19

董事長林董（Luffy Lin）。雪鑰值班。
主題：**一輪 bug 大掃 — 章節吹牛文案、綠寶截斷、R2、課程沙盒、Telegram AI、部落格 404、AI 模型清單下架/擴充、Discord owner**。

---

## 🐛 修好的

### 1. 章節吹牛文案（bug95）
- LESSON 26.3「Python 4 個基本型態—學熟就掌握 80%」→ 改「int/float/str/bool—幾乎每段程式都會用到的基礎」。已同步 DB。

### 2. 綠寶回覆被切掉
- `/api/ai/chat` `maxTokens 2000 → 8192`（各家模型都支援的上限、一般問答等於不限制）。
- 加 **「↪ 繼續回答」按鈕**：最後一則 AI 回覆下方、點了讓綠寶從中斷處接續（靠對話歷史、不重複）。

### 3. 部落格文章 404 +「缺連結」（bug96/97）
- 真因：DB `blog_slug='luffysky'`（slugify 小寫）但網址用 `Luffysky`（大寫）→ `resolveBlog` 用 `.eq` 撞不到 → 404。
- `blog-resolve.ts`：`blog_slug` 改 **`.ilike`（大小寫不敏感）** + 加 **profile username fallback**；文章 slug 查詢也改 ilike（兩處）。
- `/me/blog`：每篇公開文章加 **「查看」連結**（原本只有編輯/刪除、無法點進去看）。

### 4. Telegram AI（+ 後台一堆 AI）壞掉 — 找到系統性真因
- error_logs 抓到 `anthropic 404: model: gpt-4o`：`admin_assistant` 用途在 2026-06-08 被改成 **gpt-4o**，但 summarize-memories / kanban / line / discord / recommend 等多支「寫死打 api.anthropic.com」的呼叫端，把 gpt-4o 丟去 Anthropic → 全 404。
- 修：`ai_usage_models.admin_assistant` 改回 **claude-haiku-4-5-20251001**（一改全部恢復）。
- 另修：`embedding` 用途被設成 `gpt-4o-mini`（**不是 embedding 模型**、RAG/搜尋會壞）→ 改回 `text-embedding-3-small`。
- ⚠️ 技術債：`providerFromModel` 在 8 個檔重複、且多支呼叫端寫死 anthropic endpoint（見待辦）。

### 5. AI 模型清單更新 + 後台可 on/off
- **Gemini 2.0 Flash 已下架**（API 404）→ 設 inactive、選單不再出現。
- `ai_models` 擴充到 **22 個模型**（13 啟用 / 9 預設關）：Anthropic Haiku/Sonnet/Opus(+Fable5 關)、OpenAI 4o/4o-mini/4.1/4.1-mini(+nano/5.5/5.4-mini 關)、Google 2.5-flash/2.5-pro/3.5-flash(+lite 關)、Groq Llama3.3/3.1/gpt-oss-120b(+20b/qwen3 關)。
- admin 在 `/admin/ai/models` 用 on/off 啟停（PATCH is_active、已有）。
- migration `ai_models_refresh_2026_06.sql`（冪等、已跑、已註冊 run-migrations）。
- 另出 `docs/free_ai_apis.md`：免費/有免費額度的 API 整理（Groq/Gemini 已接；建議接 OpenRouter `:free`）。

### 6. R2 圖片上傳
- 實測 R2 PutObject 用線上憑證 **OK**（後端/憑證正常）。`next.config` `remotePatterns` 補 `*.r2.dev`（否則上傳的圖 next/image 顯示不出來、會誤判「傳不上去」）。
- 若正式機仍傳不上 → 多半是 **Zeabur runtime env 沒貼 R2_* 變數**（會回 503「尚未設定 R2」）、需林董在 Zeabur 補。

### 7. Discord owner 白名單
- 已於上一輪加 user_id；env 由林董補上（已處理）。

---

## ⏳ 需 infra 決策（沒法純 code 修）

### 課程沙盒（C# 等所有後端語言）+ 虛擬終端機
- 真因：**公開 Piston（emkc.org）2026-02-15 起改白名單制** → 所有後端執行語言回 401（C#/Go/Rust/Java… 全中；Python/JS/HTML 走瀏覽器 Pyodide 不受影響）。**非版本問題**（版本都還在）。
- 已做：run route 偵測白名單 401 → 回清楚訊息引導設定。
- **真正修復 = 自架 Piston**（Zeabur，code 已支援 `PISTON_BASE_URL`、見 docs/piston-selfhost.md）或改用 OpenRouter 之外的執行服務。
- **虛擬終端機**同樣卡在「要有可用執行後端」；Python 可用 Pyodide 做瀏覽器內 REPL（不需後端）。待林董決定方向。

---

## 🔍 推前檢查
- `tsc --noEmit` 0 錯；`npm run build` 綠。
- `audit-db-columns`：✅ 無欄位接錯；新表/新 API 都接得上；255 route 全 export。
- `check-all-tables` 報「缺 10 表」是**過時硬編清單**（blog_posts→user_blog_articles 等、程式 0 處用）、非真缺。

---

# 📋 待辦（全專案）
見 `docs/TODO.md`。
