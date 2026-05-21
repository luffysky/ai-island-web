# daily_works_0522

**專案：AI Island v3（Next.js 15 + Supabase 學習平台）**
**日期：2026-05-22**

---

## 玄樞（Codex 體系 / 技術總監 · 交付 gate owner）

### 今日完成

- 接收桌面版 Claude 透過 `ai_island_v3.zip` 交付的成果：
  - 解壓到 `.codex_zip_extract_20260522/` 作為比對來源
  - 不直接覆蓋目前 repo
  - 依 zip handoff 規則做只讀盤點

- 建立 AI Island 專屬協作規則：
  - 新增 `docs/RULE/AI_ISLAND_COLLAB_RULE.md`
  - 把舊 YukiBoard `RULE/` 的精神改寫成 Next.js + Supabase 版本
  - 明列 auth / session / Supabase client 為高敏感區、不得回退
  - 規範 zip handoff 必須先雜湊比對、再分類 SAME / DIFFERENT / ZIP_ONLY / LOCAL_ONLY

- 完成 zip diff gate 報告：
  - 新增 `docs/RULE/AI_ISLAND_ZIP_DIFF_GATE_2026-05-22.md`
  - 對 299 個檔逐一比對
  - 確認 login / signup / callback / ensure-profile / supabase clients 共 11 個檔的雜湊與目前 repo 一致
  - 把 zip 內容分成 5 個 round 移植：
    - Round 1：XpToast + ChapterView 動畫 + gamification.celebrateXp
    - Round 2：checkin_migration + DailyCheckin + dashboard 接線
    - Round 3：forum schema/API/pages/components
    - Round 4：blog schema/API/pages/components/package deps
    - Round 5：AI unlimited migration/API/admin UI/chat route

- 完成 5 round 全部移植進 repo：
  - Blog 系統：`src/app/blogs/*`、`src/app/me/blog/*`、`src/app/api/blog/*`、`src/components/blog/*`、`src/lib/blog-*`
  - Forum 系統：`src/app/forum/*`、`src/app/api/forum/*`、`src/components/forum/*`、`src/lib/forum-*`
  - Daily check-in：`DailyCheckin`、`XpToast`、`checkin_migration.sql`
  - AI unlimited：`ai-privilege.ts`、admin API、admin users UI、chat quota bypass、migration
  - OG 圖：chapter / dungeon OG route
  - TopNav forum link + 手機漢堡選單
  - SideNav 自由筆記初版
  - Blog / forum HTML 輸出加 `src/lib/rich-html.ts` 簡易清洗

- 建立 DB 套用工具鏈：
  - 新增 `scripts/run_supabase_sql.ps1`
    - 自動讀 `.env.local`
    - 把 pooler `:6543/` 轉成 session pooler `:5432/`
    - 含 dollar-quote 感知的 SQL statement splitter
    - UTF-8 no BOM 暫存檔
  - 新增 `scripts/push_current_changes.ps1`
  - `package.json` 加 `db:apply` / `git:push` script
  - `package.json` devDependency 加 `supabase` CLI

- 套用 6 份 migration 至線上 Supabase：
  - `supabase/free_notes_migration.sql`
  - `supabase/checkin_migration.sql`
  - `supabase/blog_migration.sql`
  - `supabase/forum_migration.sql`（含 11 筆初始 boards）
  - `supabase/comment_likes_migration.sql`
  - `supabase/ai_unlimited_migration.sql`

- 嘗試套用 `breach_and_email_migration.sql`、卡在線上 schema 落後：
  - 線上 `breach_incidents` 缺 `occurred_at` / `reported_to_authority` 欄位
  - 已補 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  - 但整份 migration 尚未跑完

- 開始實作後台「即時互動 / 歷史互動」面板：
  - 新增 `supabase/interaction_analytics_migration.sql`
  - 新增 `src/lib/analytics-device.ts`
  - 新增 `src/app/api/analytics/track/route.ts`
  - 新增 `src/components/analytics/InteractionTracker.tsx`
  - 新增 `src/app/admin/ga4/InteractionPanels.tsx`
  - 修改 `src/app/layout.tsx` 掛 `<InteractionTracker />`
  - 修改 `src/app/admin/ga4/page.tsx` 接 `InteractionPanels`、查 `analytics_sessions` / `analytics_page_views`
  - 修改 `scripts/run_supabase_sql.ps1` defaultFiles 加 interaction analytics

- 撰寫交接文件：
  - 新增 `docs/Codex_to_Claude.md`
  - 列已完成、未完成、線上 DB 狀態、建議接手順序
  - 標示 `ai_island_v3.zip` / `.codex_zip_extract_20260522/` / `.env.local` 不得 commit

### 今日判斷

- zip handoff gate 規則建立成功，未來桌面 Claude 再丟 zip 都可走同一流程
- 5 round 移植完成、tsc / build 在 round 5 結束時曾通過
- interaction analytics 是 round 5 之後新增的需求、未完成驗證就因額度耗盡退場
- 高敏感區（auth / session）全程未動、登入基線守住
- 交接給 `雪鑰` 接手剩下三件事：
  1. 完成 breach migration 套用
  2. 套用 interaction analytics migration
  3. tsc / build / dev server 驗收 + 線上資料流測試

### 備註

- 今日依規則未 commit `ai_island_v3.zip`
- 今日依規則未 commit `.codex_zip_extract_20260522/`
- 今日依規則未 commit `.env.local`
- 額度耗盡後正式轉交給 `雪鑰`，並要求其依交接清單順序執行

---

## 雪鑰（Claude 體系 / 設定與帳號流資深工程師）

### 今日完成

#### 1. 接手與基線建立

- 讀完 `docs/RULE/` 全部規則檔（11 份），確認 SnowRealm 雙體系協作架構與 sprint gate 規則
- 讀完 `docs/Codex_to_Claude.md` 完整交接、`docs/Claude_to_Codex.md` 完整移植日誌
- 確認自己定位為 `雪鑰`、依 `ROUND_GATE_COLLAB_RULE.md §10.1` 作為玄樞第一備援（非 .kt round 可實作 + self-gate）
- 建立角色與專案 memory 紀錄、寫入個人 memory 系統

#### 2. Code 端驗證與修復

- 跑 `tsc --noEmit` → pass

- 跑 `npm run build` → **失敗**：
  - 錯誤：`useSearchParams() should be wrapped in a suspense boundary at page "/chapters/[id]"`
  - 連帶 70+ 個靜態頁全部 prerender 失敗
  - 根因：玄樞掛在 root layout 的 `<InteractionTracker />` 是 client component、內部用 `useSearchParams`、靜態化時 bail
  - **修法**：把 `InteractionTracker` 拆成 outer + inner，outer 用 `<Suspense fallback={null}>` 包 inner
  - 再 build → ✅ 143/143 static pages 全過

- Review 並收斂 `src/app/api/analytics/track/route.ts` 為 fail-soft（Codex 交辦 todo #3）：
  - session upsert 失敗 → 改回 `{ ok: true, skipped: "session" }` 不阻斷
  - page_view upsert 失敗 → 同上
  - event insert 失敗 → warn 不阻斷
  - profile `last_active_at` 更新 → 只在 `user.id` 存在時才寫（避免無意義的 sentinel UUID 更新）
  - RPC 失敗 → warn 不丟例外

#### 3. DB migration 套用與修正

- 套用 `supabase/breach_and_email_migration.sql`：
  - migration 本身已是 idempotent（DROP POLICY IF EXISTS、ALTER ADD COLUMN IF NOT EXISTS、CREATE OR REPLACE）
  - 全部 NOTICE 都是「already exists, skipping」
  - 收尾 `Done.`

- 套用 `supabase/interaction_analytics_migration.sql`：
  - 表 / index / RLS / RPC 全部 CREATE 成功
  - 收尾 `Done.`

- 啟動 dev server 做端到端驗證、發現新 bug：
  - Node 24 fetch 無法驗證 Supabase TLS 憑證（CRT 葉憑證簽發者不在 Node bundled CA bundle 內）
  - **解法**：以 `NODE_OPTIONS=--use-system-ca` 重啟 dev server（純本機問題，production Linux 無此問題）

- Smoke test analytics track 仍失敗、再診出第二個 bug：
  - `[analytics] page_view upsert failed: invalid input syntax for type uuid: "page_smoke2"`
  - 根因：`analytics_page_views.id` schema 是 `UUID`，但前台 `InteractionTracker` 產的 ID 是 `page_<uuid>` 帶 prefix（且 `analytics_sessions.id` 是 `TEXT`、`session_id` 是 `TEXT`，是玄樞移植時遺漏的型別不一致）
  - **修法**：
    - 修改 `interaction_analytics_migration.sql` 把 `analytics_page_views.id` 從 `UUID` 改成 `TEXT`、`analytics_events.page_view_id` 同步
    - 加 `DO $$ ... END $$` 區塊，對已存在的 UUID 欄位用 `ALTER COLUMN id TYPE TEXT USING id::text` 移轉（含 FK 重建）
  - 順帶修第三個小 bug：`run_supabase_sql.ps1` 切 statement 時不認得 `--` 行內註解、把註解裡的 `;` 拿去切；改寫該行註解避開

- 重跑 migration → ALTER + DROP FK + ADD FK 全部成功、`DO` block 跑完

- 再 smoke test → `{"ok":true}` clean
- DB 查詢確認：sessions=2、page_views=1、events=1，端到端通

#### 4. 線上服務狀態查驗

- 查 AI tutor 健康度（綠寶導師線上 production）：
  - `ai_models` 7 筆、全部 active、1 個 default ✓
  - `ai_api_keys` 1 把、enabled、`monthly_budget_usd > 0`、未超支 ✓
  - RPC `consume_ai_quota` / `upsert_ai_usage` / `inc_system_key_usage` 全存在 ✓
- 查 GA4 資料：
  - `analytics_snapshots` 表存在、**0 筆**
  - 根因：`.env.local` 內 `GA4_PROPERTY_ID` / `GA4_SA_CREDENTIALS` / `CRON_SECRET` 三個 env 一個都沒有
  - sync route 已有 fail-safe 503 不會炸頁

#### 5. 後台升級盤點與規劃

- 委 Explore 子代理對整個 `src/app/admin/*` + 相關 DB schema 做 thorough 盤點
- 產出 9 維度成熟度評分(整體約 40%)：
  - 觀測 / Audit 40%
  - 使用者管理 50%
  - 內容審核 10%
  - AI / 計費 60%
  - 遊戲化控制 30%
  - 行銷 / 通訊 40%
  - 分析 50%
  - Compliance 40%
  - 效能 ops 0%

- 提出 30 個升級項目（14 quick wins + 10 medium + 6 long-term）

- 撰寫升級路線圖文件：
  - `docs/admin_upgrade/README.md`（11KB · 總圖 + 評分表 + 三階段）
  - `docs/admin_upgrade/specs/QW-01-user-list-search-paginate.md`（8KB · ~7h）
  - `docs/admin_upgrade/specs/QW-02-manual-grant-xp-zcoin-achievement.md`（11KB · ~12h）
  - `docs/admin_upgrade/specs/QW-03-audit-log-filter-export.md`（9KB · ~8h）
  - `docs/admin_upgrade/specs/QW-04-email-subscribers-list.md`（9KB · ~7h）
  - `docs/admin_upgrade/specs/QW-05-dashboard-widgets.md`（10KB · ~7h）

- 每份 spec 都依 `docs/RULE/SPEC_EXAMPLE.md` 的精神，含：
  - 功能描述 / 範圍（In / Out scope）/ 設計規則
  - **File Scope（含禁止修改）**：auth / session / supabase-* 全列入禁區
  - 資料合約（schema、URL、API request / response、audit log 寫法）
  - UI 行為（線稿、邊界、a11y）
  - 驗證標準（功能 / 安全 / 回歸）
  - 工時估、已知風險

#### 6. 綠寶導師（AI Tutor）兩個 production bug

董事長回報：「後台啟用模型了，綠寶那邊還沒辦法選；綠寶也檢測不到登入狀態」

- Bug 1 診斷：DB metadata 查發現 `ai_models` 表 RLS=true 但 policies=**0 個**
  - 後果：service_role 跳 RLS 看得到（後台正常）、anon / authenticated 走 RLS 一筆都讀不到（前台 widget 拿到 0 筆、顯示「沒有可用模型」）
  - 對照：admin 模型管理頁用 `createSupabaseAdmin`、前台 widget 用 `createSupabaseBrowser`
  - **修法**：新增 `supabase/ai_models_rls_fix.sql`，`CREATE POLICY ... FOR SELECT USING (is_active = true)`
  - 套用後直接以 anon key 打 REST API 驗證 → HTTP 200、7 筆模型回來、Claude Haiku 4.5 default ✓

- Bug 2 診斷：`AITutorWidget` 的 `useEffect` 只在 mount 跑一次、沒有 `onAuthStateChange` 監聽
  - 後果：登入後狀態 stale、widget 持續顯示「請先登入」；初始 `isLoggedIn=false` 也漏到 placeholder 變閃光
  - **修法**：
    - 三態化：`authState: 'loading' | 'in' | 'out'`
    - 加 `supabase.auth.onAuthStateChange` 訂閱、含 cleanup
    - 把單一 mount effect 拆成三個：auth state / model 載入 / quota 載入（quota 依賴 authState）
    - placeholder 區分「載入中...」與「請先登入」、不再 flash
  - `tsc --noEmit` ✓

#### 7. Commit / push（三次）

- `6f21249` feat: port blog/forum/checkin/AI-unlimited + interaction analytics
  - 104 檔（+13937 / -529）
  - 含玄樞 5 round 移植成果 + 雪鑰 interaction analytics 完成 + 三個 bug fix（Suspense / fail-soft / UUID→TEXT）
  - 排除 `ai_island_v3.zip`、`.codex_zip_extract_20260522/`、`supabase/.temp/`、`.claude/`
  - 已 push origin/main

- `8cfd127` docs: admin upgrade roadmap and phase-1 specs
  - 6 個 md 檔（+1633）
  - 已 push

- `0fbb212` fix: ai tutor model dropdown empty and login state stuck
  - 2 檔（migration + widget refactor）
  - 已 push

### 今日判斷

- 玄樞交接的 5 round 移植在 code 層都站得住，但 schema 細節（`analytics_page_views.id` UUID vs TEXT）露了一個洞、build 也卡在 Suspense 邊界——這兩件事不在交接清單但必須補；說明 Codex 額度耗盡前的「曾通過 tsc / build」是 round 5 而非 round 5+1
- 線上 Supabase 的 production-ready 評估：
  - 綠寶後端（DB / RPC / models / keys）**全綠**
  - 綠寶前端 RLS / session 是 zip 移植時就埋的兩個 bug、今日全清
  - GA4 純等 Zeabur env、code 端沒有 work
- 後台 9 維度盤點完成，整體 ~40% 成熟度；建議優先做 Phase 1 五個 quick win（合計 ~3 天）把使用者管理 / audit / 訂閱戶 / 手動補帳 / dashboard 即時感補齊
- spec 文件以 `docs/RULE/SPEC_EXAMPLE.md` 為基線、明列 file scope 與禁止區、Phase 2 / 3 動工前須先開單獨 spec
- 整段交接 + 接手沒有動到 auth / session / supabase client 任何一行；高敏感區守住

### 備註

- 今日依規則未 commit `ai_island_v3.zip`、`.codex_zip_extract_20260522/`、`.env.local`、`.claude/`、`supabase/.temp/`
- 三個 commit 均含 `Co-Authored-By: Claude Opus 4.7` trailer
- 玄樞額度耗盡狀態下，雪鑰依 `ROUND_GATE_COLLAB_RULE.md §10.1` 第一備援身分承接，無 .kt 改動所以不卡 `PENDING FINAL CODEX REVIEW`
- 凡涉及線上 DB schema 變更（breach migration / interaction analytics / ai_models RLS）均先確認可逆性、欄位型別變更前確認表為空、ALTER 而非 DROP
- 接下來等董事長親自驗：
  1. 前台強制刷新 → 綠寶 settings 下拉應看到 7 個模型
  2. 已登入狀態 → 綠寶 placeholder 直接顯示「問點什麼...」、不會閃過「請先登入」
- Phase 1 五個 quick win 待董事長下令動工
