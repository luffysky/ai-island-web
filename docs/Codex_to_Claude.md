# Codex → Claude Handoff

日期：2026-05-22  
專案：`D:\Documents\AI\ai_island_v3`

## 目前狀態

Codex 已開始移植 `ai_island_v3.zip` 內 Claude 做的功能，並修正部分安全與資料庫腳本問題。請接手時不要整包覆蓋，因為登入/第三方登入已確認不能回退。

## 已完成

### 1. Claude zip 功能已移植進專案

已搬入：

- Blog 系統：`src/app/blogs/*`, `src/app/me/blog/*`, `src/app/api/blog/*`, `src/components/blog/*`, `src/lib/blog-*`
- Forum 系統：`src/app/forum/*`, `src/app/api/forum/*`, `src/components/forum/*`, `src/lib/forum-*`
- Daily check-in：`DailyCheckin`, `XpToast`, `checkin_migration.sql`
- AI unlimited：`ai-privilege.ts`, admin API, admin users UI, chat quota bypass, migration
- OG 圖：chapter/dungeon OG route
- TopNav forum link / mobile menu
- SideNav 自由筆記初版
- Blog/forum HTML 輸出加了 `src/lib/rich-html.ts` 簡易清洗

驗證：

- `node_modules/.bin/tsc.cmd --noEmit` 曾通過
- `npm run build` 曾通過

注意：後面又新增 interaction analytics，還沒重新跑 tsc/build。

### 2. 新增協作與比對文件

- `docs/RULE/AI_ISLAND_COLLAB_RULE.md`
- `docs/RULE/AI_ISLAND_ZIP_DIFF_GATE_2026-05-22.md`

### 3. 新增腳本

- `scripts/run_supabase_sql.ps1`
- `scripts/push_current_changes.ps1`

`package.json` 已加：

- `db:apply`
- `git:push`
- `supabase` devDependency

### 4. Supabase CLI 狀態

已安裝：

```text
node_modules/.bin/supabase.cmd
supabase CLI 2.101.0
```

`.env.local` 已有：

```text
SUPABASE_DB_URL=***
```

腳本會自動讀 `.env.local`，並把 pooler `:6543/` 轉成 session pooler `:5432/`，避免 Supabase CLI prepared statement collision。

## 資料庫狀態

### 已成功跑完

以下已成功套到線上 Supabase：

- `supabase/free_notes_migration.sql`
- `supabase/checkin_migration.sql`
- `supabase/blog_migration.sql`
- `supabase/forum_migration.sql`
- `supabase/comment_likes_migration.sql`
- `supabase/ai_unlimited_migration.sql`

確認過大多數表都存在：

- core/admin/AI/blog/forum/checkin/AI unlimited 相關表存在
- forum 初始 boards 插入 11 筆成功

### 未完成 / 半完成

`supabase/breach_and_email_migration.sql` 尚未完整成功。

狀態：

- `breach_incidents` 表已存在
- `breach_incidents_admin_all` policy 已建過
- migration 仍在重跑時卡過
- 原因：線上 `breach_incidents` 是舊 schema，缺欄位；已補 migration：
  - `occurred_at`
  - `reported_to_authority`
- 但還沒完成整份 migration。

下一步 Claude 請先處理這個：

```powershell
cd D:\Documents\AI\ai_island_v3
$env:SUPABASE_TELEMETRY_DISABLED="1"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_supabase_sql.ps1 -Files supabase/breach_and_email_migration.sql
```

如果再卡 policy exists，先查：

```sql
select policyname, tablename
from pg_policies
where tablename in ('breach_incidents','email_subscriptions')
order by tablename, policyname;
```

需要時把 migration 改成所有 policy 都先 `DROP POLICY IF EXISTS` 再 `CREATE POLICY`。

## 最新需求：後台 GA4 加「即時互動 / 歷史互動」

使用者要求：

> 現在 GA4 後台有數據，但網站後台即時互動沒用。要新增即時互動跟歷史互動面板，知道哪些人在用、瀏覽什麼頁面、裝置、區域、會員上線狀態、頁面停留多久、看多少、有沒有看完，要比 GA4 更詳細。

Codex 已開始做，但未完成驗證。

### 已新增檔案

- `supabase/interaction_analytics_migration.sql`
- `src/lib/analytics-device.ts`
- `src/app/api/analytics/track/route.ts`
- `src/components/analytics/InteractionTracker.tsx`
- `src/app/admin/ga4/InteractionPanels.tsx`

### 已修改檔案

- `src/app/layout.tsx`
  - 加 `<InteractionTracker />`
- `src/app/admin/ga4/page.tsx`
  - 加 `InteractionPanels`
  - 查 `analytics_sessions` / `analytics_page_views`
- `scripts/run_supabase_sql.ps1`
  - defaultFiles 加 `interaction_analytics_migration.sql`
  - 修正逐 statement 執行、UTF-8 no BOM、session pooler 5432

### 未完成

1. 還沒跑：

```powershell
$env:SUPABASE_TELEMETRY_DISABLED="1"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_supabase_sql.ps1 -Files supabase/interaction_analytics_migration.sql
```

2. 還沒跑最新：

```powershell
node_modules/.bin/tsc.cmd --noEmit
npm run build
```

3. `src/app/api/analytics/track/route.ts` 需要 review：
   - 目前會呼叫 `analytics_increment_session_page_count` RPC，這個 RPC 已寫在 `interaction_analytics_migration.sql`
   - 請確認 migration 先跑
   - 若 RPC 失敗不應阻斷 tracking，可考慮讓它 fail-soft

4. 後台查詢若資料表未建立會讓 `/admin/ga4` error。可加 fallback 或先確保 migration 完成。

## 重要注意

1. 不要回退登入：
   - `login`
   - `signup`
   - Supabase callback
   - LINE callback
   - `ensure-profile`
   - logout
   - Supabase clients

2. 不要把 `ai_island_v3.zip` commit。

3. `.codex_zip_extract_20260522/` 是 Codex 解壓用臨時資料夾，不要 commit。

4. `.env.local` 不要 commit。

5. `scripts/push_current_changes.ps1` 已排除：
   - `ai_island_v3.zip`
   - `.codex_zip_extract_20260522`
   - `.env.local`
   - `node_modules`

## 建議 Claude 接手順序

1. 完成 `breach_and_email_migration.sql` 套用。
2. 跑 `interaction_analytics_migration.sql`。
3. 跑 `tsc --noEmit`。
4. 跑 `npm run build`。
5. 開 dev server 看 `/admin/ga4`。
6. 前台瀏覽幾頁，回後台確認：
   - active session 出現
   - page view 出現
   - duration / scroll / read_complete 有更新
7. 最後檢查 git status，排除 zip / temp / env。

