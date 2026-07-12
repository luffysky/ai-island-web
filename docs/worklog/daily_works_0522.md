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

---

## 後續工作（2026-05-22 下半起 ~ 持續）

`b1be011 docs: daily work log for 2026-05-22` 提交之後、雪鑰持續推進。本段紀錄該 commit 之後到今天的所有事項、依主題分組（commit 順序非時序、可交叉）。

### A. 認證 / 載入流再穩固（前期）

| commit | 內容 |
|---|---|
| `78f7f1a` | refactor: AuthProvider 收斂為 client auth state 唯一源（解多元件各自 onAuthStateChange 時序錯亂）|
| `68bc82e` | fix: stop INITIAL_SESSION wiping out freshly-loaded auth state |
| `70b4aa5` | fix: 停止 callback 二次 exchange PKCE code（同 code 用兩次永遠 hang）|
| `2e49712` | fix: callback timeout 前先查 session、避免假性失敗 |
| `d307d55` | fix: silent auth callback with timeout + unconditional redirect |
| `2ec521c` | feat/fix: 精確 district geo (Nominatim) + 強化 auth race for tracker/widgets |
| `278e7ad` | fix: race-resilient profile + always-clickable bookmark/note |
| `1548d36` | fix: PWA 登入 resilience + note save error reporting |
| `1371875` | debug: 在 user dropdown 顯示 loaded role（觀測用）|
| `f4be100` / `63ca93a` | debug: profile 與 model 載入紀錄、無模型時可見提示 |

### B. 內容 / SEO / Blog 路由改造

| commit | 內容 |
|---|---|
| `26858cf` | feat: dynamic chapter/lesson stats + admin SEO placeholder docs |
| `d82deb6` | feat: SEO render layer 接 DB overrides + placeholder substitution |
| `95dce6b` | feat: blog reading polish from Insight Engine port |
| `febc5e8` | fix: TopNav 加 /blogs 連結 |
| `3ccb3ca` | feat: 重建 /blogs landing 為 per-author 列表 + URL-driven 搜尋 |
| `0f2b4d9` | docs: 重寫 README 為 v3 現況 |
| `88982c2` | feat: /me layout 可收合 sidebar |

### C. AI Tutor 多人設

| commit | 內容 |
|---|---|
| `b509df6` | feat: AI tutor 支援 3 個人設（綠寶 / 肥仔 / 菇寶）|

### D. Analytics 政策收斂

| commit | 內容 |
|---|---|
| `8cbf230` | feat: site analytics 整合（decision A — 放棄 GA4 sync、走自家 interaction_analytics）|
| `197d2db` | chore: 排除 bug screenshot capture 目錄 |

### E. Admin 介面大改版

| commit | 內容 |
|---|---|
| `0f8e373` | feat: admin 主題改為輕粉色 cute via CSS cascade |
| `b5f5882` | security: 鎖定敏感 profile 欄位（trigger）+ admin sidebar 可收合 |
| `0c4acf5` | feat: admin floating toolbar + 手動發放 XP/Z-coin/成就（QW-02 部分前置）|
| `49c6287` | fix: admin 內部 href 加 slug 前綴避免 404 |
| `469f76c` | feat: admin user detail page — 單一使用者 360° 視圖 |
| `0084b74` | feat: 完整 broadcasts CRUD + 前台跑馬燈 |
| `e05e3bf` | feat: friendly settings editor + blog comment moderation queue (MED-07) |

### F. Admin Phase 1 全包（5/5 完成、Quick Wins）

| ID | commit | 內容 |
|---|---|---|
| QW-01 | `bc8618b` | user list 搜尋 + 分頁 + role/status filter |
| QW-02 | `0c4acf5` | 手動發放 XP / Z-coin / 成就 |
| QW-03 | `bc8618b` | Audit log filter + CSV 匯出 |
| QW-04 | `9e01975` | Email 訂閱戶清單頁 |
| QW-05 | `e2aae99` | Dashboard 即時 widgets（4 panels）|

### G. Admin Phase 2 七包（6/7 完成、Medium）

| ID | commit | 內容 |
|---|---|---|
| MED-06 | — | Impersonate 使用者（故意 deferred）|
| MED-07 | `e05e3bf` | Blog 留言審核佇列 |
| MED-08 | `dfcff73` | 論壇 thread + reply moderation |
| MED-09 | `26662a7` | Z-coin airdrop batch tool |
| MED-10 | `0277cbf` | Learning events viewer + CSV 匯出 |
| MED-11 | `7d5d233` | Breach incident 詳細編輯頁 |
| MED-12 | `7d5d233` | AI cost 警示閾值 |

### H. 章末 Quiz 系統

| commit | 內容 |
|---|---|
| `4a144d0` | feat: AI quiz builder 章末 20 題複習產生器 |
| `dc497b7` | feat: chapter-end quiz player + admin toolbar drag |

### I. AI 寵物（FEATURE-01 plan B 全包）

| commit | 內容 |
|---|---|
| `db29a42` | docs: 完整實作計畫 (FEATURE-01 plan B) |
| `984a63f` | feat: PR1 — schema + walking pet + 4 種物種 + 設定 |
| `4ccdb38` | feat: PR2-4 — 對話 / 心跳 / 拖曳 / 避鼠標 / 事件 hook |
| `1b28355` | build: .npmrc 加 retry 撐過 Zeabur ECONNRESET |
| `2275ad1` | feat: scripted chatter 470+ 條 × 40+ 類別 × 4 物種 voice + VIP 驚喜（luffy/nami 專屬 cute bubble、aura、condition praise、隱藏密語）+ AI tutor 國中生講解風格寫進 prompt |
| `04f83ce` | fix: luffy 姓林、不是盧 — chatter / honorific / secret keyword 全套對齊 |
| `1a93d3b` | feat: milestone 30/60/100（lesson-complete 後查總數 dispatch 事件、Pet.tsx 4.5s CSS 粒子 burst）+ season-* x4 / holiday-* x11 / streak-boost-* x3 / weather-* x4 = 25 新 chatter key、季節 / 節日當天 force say、寵物頭飾（聖誕帽 / 南瓜 / 國旗 / 愛心 / 慶祝）|

### J. UX 健檢與全站 UX-S1 起跑

| commit | 內容 |
|---|---|
| `8daf5cf` | docs: UX-AUDIT.md 完整健檢、4 個系統性 anti-pattern：39 次 alert/confirm / 29 次 `<img>` 直用 / 21+ 次阻塞 setLoading / 0 個 loading.tsx；分 6 sprint 修法（~33 hr）|
| `9a5f95a` | feat: UX-S1a — 全站 Toast + ConfirmDialog 元件（framer-motion 11、spring 進場、4s 自動 dismiss、destructive 500ms 防誤點、a11y）+ ThreadReplies 示範改造（optimistic submit / 5 秒 undo 刪除 / optimistic markAnswer / active:scale-95 微互動）|

### K. TODO list（董事長 2026-05-22 交辦、L4 範圍）

| commit | 內容 |
|---|---|
| `8a4ae7a` | feat: TODO backend — `todos` 表（id/parent_id/title/notes/completed/due_date/priority 1-3/sort_order double/recur_rule daily\|weekly:N,M\|monthly:N）+ RLS + updated_at trigger（已套上線上 Supabase）+ types-todo / todo-recur parser / 3 個 API route（GET POST PATCH DELETE reorder）|

### L. 待辦盤點與路線圖

| commit | 內容 |
|---|---|
| `b21ffac` | docs: Phase 4+ admin backlog — 林董加碼 5 區 21 項（內容 / 用戶 / 監控 / 行銷 / 教師），~17-18 週 |
| `ad0d10d` | docs: master BACKLOG — 所有未做事項單一入口（運維 6 / UX 6 sprint / TODO UI / Phase 3 LT-13~18 / Phase 4+ 21 項 / MED-06）合計 ~40 項、~21-22 週 |

### M. memory 紀錄補強

| 檔 | 內容 |
|---|---|
| `memory/user_luffy_name.md` | 董事長姓林（Luffy Lin）、稱謂用林董/林老闆/林總 |
| `memory/feedback_ux_first.md` | UX 優先、不卡頓的全局原則 |

---

## 總結

### 完成的大塊

| 區塊 | 項目數 |
|---|---|
| Admin Phase 1 Quick Wins | 5/5 |
| Admin Phase 2 Medium | 6/7（MED-06 deferred）|
| AI 寵物系統（plan B） | PR1-4 + chatter + VIP + milestone + season/holiday |
| 章末 Quiz 系統 | builder + player |
| 認證 / 載入流穩定 | 10+ commit |
| Blog / SEO / Analytics 改造 | 7 commit |
| UX 健檢 + UX-S1 起跑 | 元件 + 1 示範檔 |
| TODO list backend | 100% |
| 全範圍 backlog 文件 | 3 份（UX-AUDIT / Phase 4+ / Master BACKLOG）|

### 還沒做的（已在 `docs/BACKLOG.md` 集中）

- 林董親自驗證 6 項
- UX-S1b 後續 38 處 alert/confirm 清替
- UX-S2 ~ S6（optimistic / skeleton / image / mobile / 細節）
- TODO list UI（TopNav dropdown / 拖曳 / 編輯 modal / 寵物 hook）
- Phase 3 LT-13 ~ LT-18 全 6 項（含 LT-14 GDPR 合規剛需）
- Phase 4+ P4-01 ~ P4-21 全 21 項
- MED-06 Impersonate（待解 defer）

### 重要決策 / 紅線

| 決策 | 理由 |
|---|---|
| 所有功能 UX 優先、不卡頓 | 林董 2026-05-22 明示、寫進 memory `feedback_ux_first.md` |
| TODO list 走 L4 範圍 | 含子任務 / 拖曳 / 重複規則、跨 6 hr UI |
| schema 動之前先給林董看 sql、線上 DB 雖授權但刪除動作必須再確認 | `project_handoff_2026-05-22.md` |
| commit message 維持中文標題 + 英文 / 中混 body + Co-Authored-By trailer | 對齊 `b1be011` 之後既有風格 |
| 未動 auth / session / Supabase client 任何高敏感區 | `AI_ISLAND_COLLAB_RULE.md` 紅線守住 |

### 連線確認

- 線上 Supabase REST API HTTP 200（profiles 表 query OK、anon key 正確）
- TypeScript `tsc --noEmit` 各階段全綠
- git remote `origin/main` 已對齊本地、所有 commit 全 push

### 接下來

依 `docs/BACKLOG.md §8` 雪鑰建議順序：

1. UX-S1b（38 處 alert/confirm 清完）
2. TODO list UI 收尾
3. UX-S3 loading.tsx skeleton
4. UX-S4 圖片全換 next/image
5. UX-S2 全站 optimistic
6. P4-10 錯誤日誌 + P4-14 rate limit（剛需止血）
7. LT-14 GDPR
8. P4-01 + P4-02 章節後台編輯
9+. 其餘依 BACKLOG 順序

---

**備註**：
- 所有 commit 標 `2026-05-22`、實際工作跨多個 session、依 commit 順序 ≈ 時間順序
- 玄樞（Codex）於 daily_works_0522 上半段「Codex 額度耗盡退場」後未再回場、本段全部由雪鑰執行
- 桌面 Claude（最早 zip 交付者）本段內無動作
