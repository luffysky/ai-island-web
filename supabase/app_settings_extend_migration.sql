-- ============================================================
-- app_settings 補欄位 — 給 /admin/app-settings CRUD 用
-- 既有：key (PK), value (JSONB), description, updated_by, updated_at
-- 新增：category, is_secret, value_type (給 UI 分組 / mask / 編輯器選型)
-- ============================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'json'; -- 'string' | 'number' | 'boolean' | 'json' | 'string_array'

CREATE INDEX IF NOT EXISTS idx_app_settings_category ON public.app_settings(category);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_app_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_app_settings_trigger ON public.app_settings;
CREATE TRIGGER touch_app_settings_trigger
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_settings();

-- 補幾筆常用的 app 層設定 (從 env 搬過來、UI 上能 CRUD)
INSERT INTO public.app_settings(key, value, description, category, value_type, is_secret) VALUES
  ('admin_emails',               '["luffysky00@gmail.com"]'::jsonb, '收 admin 通知的 email 清單 (用於系統警示、KPI 報表)', 'notification', 'string_array', false),
  ('admin_line_user_ids',        '[]'::jsonb,                       '收 admin 通知的 LINE userId 清單', 'notification', 'string_array', false),
  ('feature_blog_enabled',       'true'::jsonb,                     '部落格模組是否啟用', 'feature', 'boolean', false),
  ('feature_forum_enabled',      'true'::jsonb,                     '論壇模組是否啟用', 'feature', 'boolean', false),
  ('feature_island_enabled',     'true'::jsonb,                     '3D 島嶼模組是否啟用 (關 = 維護頁)', 'feature', 'boolean', false),
  ('feature_pet_enabled',        'true'::jsonb,                     'AI 寵物是否啟用', 'feature', 'boolean', false),
  ('email_from',                 '"AI 島 <noreply@ai-island-web.snowrealm.pet>"'::jsonb, '寄件人 (覆寫 EMAIL_FROM env)', 'email', 'string', false),
  ('email_support_address',      '"support@snowrealm.pet"'::jsonb,  '客服 email (顯示在頁尾 / contact)', 'email', 'string', false),
  ('site_keywords',              '["AI 學程式","程式新手","Python","JavaScript","前端","後端"]'::jsonb, '首頁 SEO keywords', 'seo', 'string_array', false),
  ('rate_limit_ai_per_min',      '20'::jsonb,                       'AI 端點 per-IP 每分鐘上限', 'limits', 'number', false)
ON CONFLICT (key) DO NOTHING;

-- 標記既有 seed 的 category
UPDATE public.app_settings SET category = 'system', value_type = 'json' WHERE key IN ('site_announcement', 'maintenance_mode', 'feature_flags');
UPDATE public.app_settings SET category = 'feature', value_type = 'boolean' WHERE key = 'signup_enabled';
UPDATE public.app_settings SET category = 'commerce', value_type = 'json' WHERE key = 'premium_price';
