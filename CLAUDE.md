# AI 島（ai-island-web）— Claude 工作須知

繁體中文專案。Next.js 15 App Router + Supabase + Zeabur。站點：ai-island-web.snowrealm.pet

---

## ⚠️ 最重要的雷：章節內容是從「資料庫」讀的，不是 JSON 檔

**改了 `src/data/chapters/*.json` 之後、線上不會變——因為前台是讀 Supabase 的 `chapters` / `lessons` 表、JSON 只是「DB 掛掉時的 fallback」。**

- 讀 DB 的（透過 `@/lib/content` 的 `getChapterMetas` / `getChapter` / `getNavChapters`）：
  `/chapters`、`/chapters/[id]`、nav、OG、career… → 這些看到的是 **DB 的內容**。
- 讀靜態 JSON 的（`@/data/chapters`，編譯進 bundle）：island、`me/*`、`quiz/today`、learning-plan… → 這些看 JSON。

### 改完 JSON 一定要做的事
```bash
node scripts/import_chapters_to_db.mjs        # 全部同步
node scripts/import_chapters_to_db.mjs ch79   # 只同步指定章
```
這支 **upsert（只新增/更新、不刪）** 把 JSON 灌進 `chapters` + `lessons` 表。**不跑這個、線上永遠是舊的。**

- **`sort_index` 一定要同步**（衍生章排序靠它：72=8.5→Ch08a、77=28.5→Ch28a、79=28.9→Ch28c…）。腳本已含 `sort_index: ch.sortIndex ?? ch.id`；少了它、Angular / 28a-c 會用 id 排到最後面。
- `/chapters` 是 `force-dynamic`（即時讀 DB）、`/chapters/[id]` 是 `revalidate=60` → **DB 改完即時生效、不用 rebuild / redeploy**（最多等 CDN 快取）。
- 顯示編號（Ch28a/28b/28c）= `src/lib/chapter-display.ts` 用 `sortIndex` 的小數段算（.5/.6→a、.7/.8→b、.9→c）。**這是 code、要靠部署 image**；新增衍生章記得在 `CHAPTER_SORT_INDEX` 補一筆。
- 排查口訣：**線上章節怪 → 先看 DB（`chapters.sort_index`、有沒有該章）、不是看 JSON、也不是換 image。**

### ⚠️ Supabase 1000 筆截斷（lessons 已 >1000）
PostgREST 預設一次最多回 **1000 筆**。`lessons` 表已 1258 筆、任何「一次撈全部 lessons」的查詢（`from('lessons').select('*')` 不帶 chapter 過濾）會被**默默截斷**、導致部分章節缺課（最後灌的 ch79 整批掉光、顯示 0 節）。`content.ts` 的 `getAllChapters`/`getChapterMetas`/`getNavChapters` 已改用 `fetchAllLessons()`（`.range()` 分頁撈滿）。**之後任何撈整表的查詢都要分頁、別直接 `.select('*')`。**（單章用 `.eq('chapter_id', id)` 過濾的不受影響。）

---

## 部署：Zeabur + GHCR（prebuilt image）

- 部署在 **Zeabur**。Zeabur 自家 buildpack（zbpack）**偶爾會把 Next 誤建成「只跑 Caddy 靜態、不起 node server」→ 全站 `/api` 被 Caddy 回 404**（啟動 log 只有 Caddy/GOMAXPROCS、沒有 `▲ Next.js`）。這不是程式問題。
- **解法 = 用 GHCR 預建 image**（繞開 zbpack）：
  - `.github/workflows/docker.yml`：push `main` → 用 repo 的 `Dockerfile` build → 推 `ghcr.io/luffysky/ai-island-web:latest`（+ `sha-<short>`）。`Dockerfile` 是 standalone、`CMD node server.js`。
  - Zeabur 服務設 **Prebuilt Image** = `ghcr.io/luffysky/ai-island-web:latest`。GHCR 私有 → 設 package 為 **Public**、或給 GitHub PAT（scope `read:packages`、user `luffysky`）。Port 3000。runtime env 貼 `.env.local`。
  - **Prebuilt Image 不會自動拉新 `:latest`** → `docker.yml` 尾巴用 Zeabur GraphQL **`restartService(serviceID, environmentID)`** 自動重部署（image 服務用 `restartService`、**不是** `redeployService`——後者只給綁 git 的服務、會回 `Cannot redeploy in-place`）。token 在 GitHub secret `ZEABUR_API_TOKEN`。
- 也見記憶 `deploy-zeabur-ghcr-fallback`。

---

## 內容生成 / 編輯

- **編輯既有 chapter JSON 用 Python**（`json.dump(ensure_ascii=False, indent=2)+"\n"` 與既有檔逐字一致；JS `JSON.stringify` 格式不一致、會產生整檔 diff）。
- 可重跑的 AI 草稿生成器（憑證靠 `scripts/_lib/print-ai-creds.mjs` 注入 `AI_MODEL`/`AI_API_KEY`）：`gen-chapter-metadata.py`、`gen-lesson-miniquiz.py`、`gen-enrich-thin-lessons.py`、`gen-stub-lesson-content.py`、`seed-leetcode-questions.mjs`。長 markdown 不要包進 JSON（Haiku 會吐 raw 換行壞掉）、用純 markdown / 分隔線回傳。
- 內容規格：`docs/ch26_beginner_friendly_spec_v0`（術語英中對照 + 四種區塊標籤 📄🖥️⌨️💬 + 預設讀者零基礎 + ☕用人話講）。不跟學員掛保證（接案/面試/收入）。
- commit 訊息結尾加：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 每日測驗題庫

- 章節半邊抽 `lesson.miniQuiz`；leetcode 半邊抽 **`leetcode_questions`** 表（**不是** `leetcode_problems`——那只是題目目錄、沒選項/答案）。要更多題：`node scripts/seed-leetcode-questions.mjs --limit N`。
