-- 補建 seo_overrides 表（admin 後台「章節/路徑 SEO 覆寫」功能在用、但表沒建 → upsert 會 500）
-- 來源：src/app/api/admin/seo-overrides/route.ts（path 唯一、title/description/og_image 覆寫）
CREATE TABLE IF NOT EXISTS public.seo_overrides (
  path        text PRIMARY KEY,
  title       text,
  description text,
  og_image    text,
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;

-- 讀：所有人可讀（SEO meta 是公開的，render 時要拿得到）
DROP POLICY IF EXISTS seo_overrides_read ON public.seo_overrides;
CREATE POLICY seo_overrides_read ON public.seo_overrides FOR SELECT USING (true);

-- 寫：只走 service_role（後台 admin client）；client 不能改
DROP POLICY IF EXISTS seo_overrides_no_client_write ON public.seo_overrides;
CREATE POLICY seo_overrides_no_client_write ON public.seo_overrides FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
