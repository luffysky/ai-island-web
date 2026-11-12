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

---

# 同日續（11/12 深夜 ～ 11/13 凌晨）

> 摘要：待辦大掃描重整 → 清 Zeabur 殘留 + 刪孤兒 API + Sentry 上線 → 章節補教具 / 罐頭題 / 收入保證清理 → 晨報防重送 → GitHub Actions 排程搬 Vercel Schedules。共 9 個 commit（`de025953` → `3a1324e0`）。

## 🗂️ 待辦大掃描 → 新主檔 `todo_list_1113.md`

4 組子代理把 `todo_list_0806.md`（586 行）+ `todo_list_0916.md` 的每個未完成項，逐項對照 code / DB / git log 核對，重寫成只留真正未做的新主檔。舊兩檔加封存註記，`CLAUDE.md` 待辦指標改到 1113。

**做了但沒劃的**（列在新檔附錄 A）：fortune.share 補譯、主動代理、Agent 教學閉環、語音 §2.8 子項全部、client-action 中繼層、晨報開關、nav 每日情報、bundle analyzer、追蹤鈕/ai-runs 前端、儲值套餐+商城、ch26/27 白話化。

**舊檔寫錯的**：
- 「全站罐頭練習 0」→ ch38/39/50 還有 8 課同一句「跑 hello world」。
- 「ch1–11 教具 100%」→ ch02–06/08–11 各還有 1–2 課沒互動；另列出全部缺口章節。

**作廢**：Zeabur/GHCR/`ENABLE_SERVER_BROWSER`/伺服器端 `browser.render`（Vercel 無 Chromium）。

**cron 檢查**：DB 時間戳顯示 `fortune-daily`、`opportunity-radar`（cron-job.org）搬家後仍每天跑；`daily-brief`、`agent-schedules`、`opportunity-deadlines`、`keep-warm` 沒有 GitHub Actions 也沒執行紀錄 → 列為林董確認項。

**驗證**：純文件變更，無程式/DB 變動。

## 🧹 清理 + 監控 + 內容補洞（同日第二批）

**1. Zeabur 殘留**：後台 env/ops/discord/ga4/email/telegram/payments/rich-menu、LINE/TG webhook 錯誤提示、cron-auth 等「去 Zeabur 設」全改 Vercel；隱私頁第三方服務改 Vercel + Cloudflare R2，並揭露 AutoTranslate 會把畫面上未翻的中文送機器翻譯（輸入框不送）。刪除 5 支無呼叫端 API（store/inventory、review/list、assets/[id]/lineage、me/learning-plan base、me/recommended-chapters）。`/admin/marketing/publish` 改名「發佈通路狀態」、blog 死連結改指 `/admin/blog-seed`、內部連結改 adminHref。

**2. Sentry**：`@sentry/nextjs@11.10.0`（pin）。`src/lib/sentry/options.ts`（沒 DSN 不啟用、只在 production、sendDefaultPii=false、無 Replay、traces 5%、過濾 ResizeObserver/ChunkLoadError/擴充套件雜訊）、`src/instrumentation.ts`（server/edge + onRequestError）、`src/instrumentation-client.ts`（+ 路由轉場）、`error.tsx` 回報。`next.config.mjs` 包 `withSentryConfig`（從 `@sentry/nextjs/config` 匯入；只有 `SENTRY_AUTH_TOKEN` 存在才上傳 source map）。
- ⚠️ 雷：rollup 4.66.0 的平台二進位在 npm 上不存在（404），lock 只留空殼 → 建置找不到 `@rollup/rollup-*`。`package.json` `overrides.rollup = 4.61.1` 解掉（lock 已含 linux-x64-gnu，Vercel 能裝）。

**3. 內容**：ch38/39/50 最後 8 題罐頭練習換量身題；4 組子代理補 **74 課**互動教具 → 主線 ch00–60、76–79 **0 缺口**；移除 ch14.9/14.20/39.11 的「月入保證」與 ch28.25/30.24/30.25 教規避反爬（stealth/TLS impersonate/代理輪換）的段落。27 章 `import_chapters_to_db.mjs` 已同步（0 errors）。
- 新發現：還有 28 課提到月入/年收，列入待辦 B2b 逐課判斷。

**驗證**：`tsc` ✅、`vitest` ✅ 256、`next build` ✅；章節驗證腳本：無重複教具、教具型別全在 LessonDemos 支援清單內。

**Sentry 上線**：林董登入後，用 org `snowrealm` 的空專案 `javascript-nextjs`；`NEXT_PUBLIC_SENTRY_DSN` 以 config 型別加進 Vercel（production+preview）→ redeploy → 正式站 main-app chunk 已含 DSN、送測試事件 200 並出現在 Sentry Issues。source map 上傳需 auth token（可選）。

## 💸 收入保證清理 + 晨報防重送（第三批）

**內容**：28 課「月入/年收」逐課判斷——免責聲明與事實數據保留；保證式（「學會 = 月入 X」「X 個客戶 = 月入 Y 被動」「躺著收錢」「累積 5 年 = 半退休」）全改寫，含 tip、miniQuiz 選項與解析（正解不變）；示意試算標「不是保證」、個案加「少數成功者、不代表一般結果」。順手在 29.5 Apify 範例加註 LinkedIn/IG 禁止爬取。ch27/28/29/30/37/39/42/47/50 已 import DB。

**晨報 dedupe**：`/api/cron/daily-brief` 原本沒有防重送 → 加「台北今天已送過就跳過」（批次查 notifications 標記、送出後寫一筆「今日晨報已送出」站內通知當標記，同 fortune-daily 做法）。

**排程觀察（重要）**：GitHub Actions 排程延遲嚴重——`agent-reaper` 設每 15 分實際一天只跑 3 次、`line-daily` 設台灣 09:00 實際 05:04 / 16:08 才跑；cron-job.org 準到秒（fortune-daily 每天 08:00:35）。→ 晨報等**不搬到 GitHub Actions**（會更糟）。可靠方案＝Vercel Cron（Pro、自動帶 `Authorization: Bearer CRON_SECRET`，`verifyCronAuth` 已支援）——待林董決定。

**驗證**：`tsc` ✅、`vitest` ✅ 256、`next build` ✅。

## ⏰ GitHub Actions 排程搬 Vercel Cron（第四批）

新增 `vercel.json` crons（時間/參數照原 workflow、UTC）：agent-reaper(*/15)、anomaly-check(*/30)、ops-alerts(*/30)、forum-ai-residents(每小時:15)、translate-content(每 3 小時)、line-daily(01:00 daily / 14:00 weekly)、kpi-email(01:05 daily / 週一 01:10 weekly)、creator-daily-pairing(02:00)、idea-weekly-connection / learning-coach(週一 01:00)、model-health(03:17)、streak-reminder(12:00)。12 個 workflow 拿掉 `schedule:`、保留 `workflow_dispatch` 手動觸發；e2e/smoke/wandbox-update（CI 用）不動。路由全走 `verifyCronAuth`，Vercel Cron 自動帶 Bearer CRON_SECRET，免改程式。CLAUDE.md 部署章節同步改寫。

**同日續：Cron Jobs → Vercel Schedules**：Vercel 後台把 Cron Jobs 標為 Legacy。照官方遷移文件把 `vercel.json` 的 `crons` 換成 `schedules`（14 條、具名、path 目標 + `requestMethod: "GET"`、UTC 不變），同一次改動移除 `crons` 避免重複執行。路由不用改（仍驗 Bearer CRON_SECRET）。之後可用 `vercel schedules executions` 看執行紀錄（Cron Jobs 沒有）。

**Schedules 驗證**：部署後 `vercel schedules list` 14 條全 active、舊 Cron Jobs 0 條；`agent-reaper` 排程觸發 + 手動 `vercel schedules invoke` 兩次皆 succeeded（0 失敗、平均 252ms）→ Bearer CRON_SECRET 驗證通過。⚠️ 雷：這次推 `vercel.json` 後 Git 整合沒建部署（沒錯誤、沒紀錄），推一個空 commit 才觸發——之後改 `vercel.json` 推完要確認有新部署。

## 📌 本日收尾
- 待辦：`docs/todo/todo_list_1113.md`（詳細主檔）更新到最新；`docs/todo/TODO.md` 改成一頁總覽（新增「11/12～13 完成」與「現行全部待辦」，舊 6/23 內容保留在下方、做完的劃線）。
- 驗證：每批 `tsc` ✅、`vitest` ✅ 256、`next build` ✅；章節改動全部 `import_chapters_to_db.mjs` 同步（0 errors）；正式站部署 Ready。
