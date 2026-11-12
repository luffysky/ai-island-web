# 工作日誌 · 2026-11-13

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
