# 工作日誌 · 2026-11-12

## 🌏 i18n：新增簡體中文 + 補翻所有語言

**簡體中文（zh-CN）**：不另外維護翻譯，全部從繁體用 OpenCC（台灣用語→大陸用語）轉。
- `src/i18n/locales.ts` 加 `zh-CN`（简体中文）、`contentLocale()`、`htmlLang()`；地區預設 CN/SG 或 `Accept-Language: zh-CN/zh-Hans` → 簡體。
- 介面訊息：`request.ts` 把 `zh.json` 轉成簡體（每個 instance 轉一次），改 `zh.json` 就自動同步，**沒有 zh-CN.json**。
- DB 內容：`content-i18n.ts` 的 localize 系列遇到 `zh-CN` 先用 `zh` 取，再轉簡體（`lib/zh-convert.ts`）。
- 字型：`:root:lang(zh-Hans-CN)` 改用 Noto Sans SC；語言選單、TranslateButton 加「简体中文」。

**補翻寫死在程式裡的中文（所有語言）**：盤點約 910 個檔、1.5 萬行中文沒走 i18n。新增最後一層 `components/i18n/AutoTranslate.tsx`（layout 掛一次）：
- 簡體：瀏覽器端 OpenCC 直接轉（只有簡體使用者才下載字表）。
- 英日韓：收集畫面上剩下的中文 → `POST /api/i18n/ui` → 先查 `ui_translations` 快取，沒有才用免費 Google 翻（多個字串合成一次請求）並存起來，全站共用。
- 只改文字節點和 placeholder/title/aria-label/alt，等頁面 load + 空閒才開始（避免 hydration mismatch）。`code/pre/textarea`、`translate="no"`、`data-no-translate` 不翻。
- 訊息檔：en/ja/ko 補齊缺的 10 個 key（`fortune.share.*`、`fortune.iching.locked*`）。
- 順手修：`/api/translate` 目標 `zh` 會被 Google 當簡體，改送 `zh-TW`。

**DB**：新表 `ui_translations`（`supabase/ui_translations_migration.sql`，已執行，RLS 開、只走 service-role）。

**驗證**：`tsc` ✅、`vitest` ✅ 256、`next build` ✅。本機 production + 無頭瀏覽器：簡體頁 4 頁繁體專用字 0、無 hydration 錯誤；英文首頁第二次載入中文剩 45 字、`/chapters` 英韓 0。

**待辦**：
- 自動翻譯是機器翻譯、且首次載入會先閃中文；流量高的頁面（首頁、/me、/agent、/opportunities、/creator-island）之後逐步抽成正式 i18n key。
- 後台（/admin）、LINE/Discord bot 回覆目前也會被自動翻，未特別排除。
