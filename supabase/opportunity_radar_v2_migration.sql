-- 機會島雷達 V2（§3.3.1 API/sitemap 來源 + §3.3.2 三層 hash 變動偵測）。冪等、純加法。
-- 跑法：node scripts/run-sql.mjs supabase/opportunity_radar_v2_migration.sql

-- ── 來源：來源級變動偵測 + api/sitemap 設定 ────────────────────────
-- tier 1（HTTP 條件式請求）：存上次的 ETag / Last-Modified，下次帶 If-None-Match / If-Modified-Since，
--   來源回 304 就整支跳過（最省：連 body 都不用下載）。
ALTER TABLE public.opportunity_sources ADD COLUMN IF NOT EXISTS http_etag text;
ALTER TABLE public.opportunity_sources ADD COLUMN IF NOT EXISTS http_last_modified text;
-- tier 2（來源 body 雜湊）：下載到 body 後算 sha256，跟上次一樣就跳過解析（來源整體沒變）。
ALTER TABLE public.opportunity_sources ADD COLUMN IF NOT EXISTS content_hash text;
-- api/sitemap 需要的額外設定：
--   api  → { "itemsPath":"data.results", "titleField":"name", "urlField":"url", "summaryField":"desc", "publishedField":"date", "headers":{...} }
--   sitemap → { "followIndex": true, "recentDays": 30 }（可選）
ALTER TABLE public.opportunity_sources ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;

-- ── 候選：逐項內容雜湊（tier 3 變動偵測）─────────────────────────
-- 同 URL 已在佇列時，比對此 hash：不同＝來源把內容改了（截止/獎金/資格可能變動）→ 更新原文並記時間，
--   讓後台審核者注意「這筆變過」。此為 §3.3.4 版本比較的基礎欄位。
ALTER TABLE public.opportunity_candidates ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE public.opportunity_candidates ADD COLUMN IF NOT EXISTS content_changed_at timestamptz;
