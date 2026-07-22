# AI 島（ai-island-web）— Claude 工作須知

繁體中文專案。Next.js 15 App Router + Supabase + Zeabur。站點：ai-island-web.snowrealm.pet

---

## 🚨 鐵規則：每次 commit / push 前一定要跑完這張檢查清單

**不准跳過。任何一項沒過就不 commit、不 push。** 全部綠燈後「先更新工作日誌」再 commit / push。

1. **API / 資料庫 / 資料表**：這次改動有沒有需要**跑腳本 / 建表 / 改欄位**？
   - 新增或改欄位/表 → migration 有沒有跑？（`supabase/*.sql`）
   - 內容有沒有需要跑 seed / import / 生成腳本才會生效？（章節要 `import_chapters_to_db.mjs`；部落格/留言等寫 DB 的內容跑對應 script）
   - **API ↔ 前後端 ↔ 欄位有沒有接對**：前端打的 API 真的存在、回傳欄位名跟前端用的一致、DB 欄位真的有這欄（可用 `node scripts/audit-db-columns.mjs` 驗證），沒有「有 UI / 有表但沒真接」的假功能。
2. **UI 有沒有接對**：畫面上的每個按鈕 / 表單 / 資料，背後的 API 跟資料流真的通，不是空殼。
3. **RWD（手機版）不要破版**：所有動到的介面在窄螢幕都不能溢出/跑版；超出的用 scroll、不要 hidden 硬切。
4. **桌面版也不要破版**：不是只顧手機——**所有介面、桌面寬螢幕一樣要檢查**，版面、對齊、間距都正常。
5. **PWA**：有沒有影響 PWA（manifest / service worker / 離線 / 安裝）？動到相關的就驗一下。
6. **建置驗證**：`npx tsc --noEmit`、`npx vitest run`、`npx next build` 都要綠（push = 自動上線，build 壞了會害 CI 失敗、可能推出壞版）。
7. **全部沒問題 → 先更新工作日誌（`docs/worklog/daily_works_*.md`）→ 再 commit / push。** 完成的 todo 用刪除線標記、不要刪。（待辦統一寫 `docs/todo/todo_list_0722.md`＝**現行主檔**，0721 整合全部舊 todo 檔並核對、0722 續用更新；`todo_list_0721/0715/0714/0713.md` 等全部留作歷史，見檔末〈附錄 A〉）
8. **機密**：`.env.local` / 真金鑰永不 commit；`docs/logerr.md`、`docs/note.md` 保持 untracked。

> 排查心法：介面怪 → 先確認「資料有沒有真的接到」（API/欄位/腳本）而不是只改前端樣式。

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
- 內容規格：`docs/content/ch26_beginner_friendly_spec_v0.md`（術語英中對照 + 四種區塊標籤 📄🖥️⌨️💬 + 預設讀者零基礎 + ☕用人話講）。不跟學員掛保證（接案/面試/收入）。
- commit 訊息結尾加：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## 每日測驗題庫

- 章節半邊抽 `lesson.miniQuiz`；leetcode 半邊抽 **`leetcode_questions`** 表（**不是** `leetcode_problems`——那只是題目目錄、沒選項/答案）。要更多題：`node scripts/seed-leetcode-questions.mjs --limit N`。

---

## 程式辭典（/dictionary）— 續寫接力

繁中原生、白話＋比喻的「程式術語 × 語法 × 工程師黑話」辭典。規劃書 `docs/content/dictionary_plan.md`。

- **資料表** `dictionary_terms`（migration `supabase/dictionary_migration.sql` 已跑）。`domain` 欄位預留給未來「語言島」的英/日辭典共用（`domain='english'|'japanese'`）。
- **種子＝手寫、零 API**：`scripts/_data/dictionary-seed-N.json`（一個物件一條，欄位：slug/term/zh_name/category(syntax|concept|slang|tool|error|reference)/langs/plain/analogy/example/related/difficulty(1-3)）。**由我直接 author，不跑生成器、不花 AI 錢。**
- **灌 DB**（冪等、依 slug upsert、讀所有 seed 檔）：`node scripts/import-dictionary.mjs`。
- **目前進度：1986 條 / 目標 5000。續寫從 `dictionary-seed-48.json` 接下去編號**（別重複既有 slug；批次主題見各 commit 訊息）。**「續辭典」= 從第 48 批繼續 author→import→commit→push。**（0721 加 42 批 = 網路協定/Web/資安/加密驗證 41 條〔tls-handshake/mtls/dns-resolution/cname/mx-record/http2/http3/quic/mtu/packet-loss/latency/dns-over-https/preflight/same-origin-policy/csp-header/keepalive/chunked-transfer/etag/sni/mitm/idor/ssrf/path-traversal/privilege-escalation/session-hijacking/replay-attack/argon2/pbkdf2/hmac/certificate-authority/public-key-crypto/totp/httponly-samesite-secure-cookie/subresource-integrity/zero-trust/key-rotation/secrets-management/waf/nonce〕；0721 加 41 批 = DB查詢/Git/K8s雲原生/LLM/分散式系統 33 條〔n-plus-1/query-optimization/full-text-search/detached-head/fast-forward/pod-k8s/container-orchestration/sidecar-pattern/k8s-namespace/horizontal-vertical-scaling/blue-green-deploy/rolling-update/infrastructure-as-code/ci-cd-pipeline/liveness-readiness-probe/top-p-sampling/semantic-search/lora-finetune/mcp-protocol/tool-calling/function-calling/idempotency/exponential-backoff/message-queue/pub-sub/two-phase-commit/bloom-filter/consistent-hashing/quorum/leader-election/gossip-protocol〕；0713 加 21–30 批；0721 加 36-39 批 = Python 模組共 97 個，每條含詳細功能+何時用+範例：36=內建 stdlib〔csv/sqlite3/random/secrets/uuid/functools/glob/shutil/heapq/concurrent.futures/multiprocessing…〕、37=外部〔scrapy/playwright/httpx/lxml/openpyxl/pillow/opencv/scipy/plotly/polars/tqdm/rich/typer/boto3/openai/anthropic/langchain/streamlit/celery/faker…〕、38=更多內建〔calendar/hashlib/decimal/fractions/textwrap/difflib/pprint/contextlib/operator/inspect/importlib/timeit/cProfile/struct/io/ipaddress/unicodedata/ctypes/weakref/doctest…〕、39=更多外部〔transformers/spaCy/nltk/gradio/statsmodels/xgboost/pymongo/redis/psycopg2/uvicorn/websockets/cryptography/pyjwt/passlib/arrow/apscheduler/loguru/sentry/black/ruff/mypy/hypothesis/pyinstaller/qrcode…〕）
- ⚠️ 辭典已收很多 Python 條目(含常見模組 requests/pandas/numpy/os/json…)，續寫 Python 模組前先查既有 slug 避免重複。新增批次後可跑 `node scripts/translate-sync-all.mjs` 補 i18n(免費 Google、長跑、頁面沒譯 fallback 中文)。
- **i18n**：辭典已接翻譯管線（`content-i18n.ts` + `translate-sync-all.mjs` 的 `dictionary` scope，翻 zh_name/plain/analogy，term/example 不翻）。新增批次後跑 `node scripts/translate-sync-all.mjs`（免費 Google、長跑會斷、冪等重跑即可）補譯。頁面已在地化（切語言看譯文、沒譯 fallback 中文）。
- **頁面**：`/dictionary`（搜尋+分類/語言篩選，`DictionaryBrowse.tsx`）、`/dictionary/[slug]`（白話+比喻+範例+相關詞、`DefinedTerm` JSON-LD）。nav 已加「程式辭典」（四語 i18n）。Hero 用自建 `public/lotties/dict-sparkle.json`。
