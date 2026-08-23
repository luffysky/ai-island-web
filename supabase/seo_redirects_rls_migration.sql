-- §7.0.1 SEO 轉址：讓 middleware 能以 anon 讀「啟用中」的轉址規則套 301/302。冪等、純加法。
-- 跑法：node scripts/run-sql.mjs supabase/seo_redirects_rls_migration.sql
-- 說明：seo_redirects 原本無 RLS（= 對 anon 全開）。改成 RLS 開 + 只公開讀 enabled 列，
--       比原本更安全（未啟用/內部欄位不外流）；後台 CRUD 走 service_role、繞過 RLS 不受影響。

ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

-- 公開讀：只讀啟用中的轉址（middleware 用 anon key 撈這批套轉址）。
DROP POLICY IF EXISTS "public read enabled redirects" ON public.seo_redirects;
CREATE POLICY "public read enabled redirects" ON public.seo_redirects
  FOR SELECT USING (enabled = true);

-- 查詢用索引（from_path 已 UNIQUE，這裡補啟用過濾的常用查詢）
CREATE INDEX IF NOT EXISTS idx_seo_redirects_enabled ON public.seo_redirects(enabled) WHERE enabled = true;
