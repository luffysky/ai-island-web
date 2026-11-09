# 工作日誌 · 2026-11-09

## 🚚 部署遷移：Zeabur → Vercel（Zeabur 2026-12-31 停止營運）

**背景**：Zeabur 宣布停運（12/1 起共享叢集暫停、12/31 全停並刪資料），且 10/14 發生資安事件。改由 Vercel 直接從 GitHub 建置 Next.js，不再用 GHCR image。

**程式改動**（分支 `migrate/vercel`）：
- **安全升級**：Next.js 15.5.19 → 15.5.28（修多個 critical/high）、postcss 升級。`sanitize-html` 官方尚未發布修補版，維持 2.17.3。
- **Agent 背景任務**：`runAgentTaskDetached` 改回傳 Promise，`launchAgentTask` 用 `after()` 包住；三個入口 maxDuration 設 800 秒。Vercel 上跑到 780 秒自動標 failed，避免 awaiting_approval 永遠卡住（agent-reaper 只收 planning/running）。
- **建置**：`output: standalone` 只在非 Vercel 啟用；`outputFileTracingIncludes` 帶上 `src/data`（runtime fs fallback）；`/api/version` 讀 `VERCEL_GIT_COMMIT_SHA`；engines 固定 Node 22。
- **上傳 4.5 MB 限制**：新增 `lib/upload-client.ts` 的 `postUpload()`，超過 4 MB 自動 presign 直傳 R2（6 支元件改用）；字體上傳改為簽名直傳 Storage（`/api/admin/fonts/upload-url`）。
- **課程圖**：`public/lesson-img` 110 張轉 WebP 上傳 R2（980 MB → 28.5 MB），`LessonImage` 顯示時把 `/lesson-img/*.png` 換成 R2 網址；章節內容與 DB 不用動。

**Vercel 專案**：`ai-island-web`（Pro、Next.js、Node 22、Functions 區域 sin1、Fluid、Build Command 帶 4GB heap、已連 GitHub）。環境變數從 `.env.local` 同步 71 個（略過空值與程式未引用的）。

**待辦**：預覽站驗證 → 切 DNS → 停用 `docker.yml` → 更新 `CLAUDE.md` 部署章節 → 輪替所有金鑰（Zeabur 資安事件）。

**驗證**：`tsc --noEmit` ✅、`vitest run` ✅ 256、`next build` ✅。無 DB 變動。
