-- LINE admin 個人偏好（每個 admin 選自己要收哪些 kind）
-- 在 Supabase SQL Editor 執行

CREATE TABLE IF NOT EXISTS public.admin_line_prefs (
  line_user_id TEXT NOT NULL,
  kind         TEXT NOT NULL,           -- 'visit' / 'leave' / 'login' / 'lesson_complete' / 'achievement' / 'forum_reply' / 'level_up' / 'order' / 'error' / 'fatal' / 'cron_daily' / 'cron_weekly' / etc
  enabled      BOOLEAN NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (line_user_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_alp_user ON public.admin_line_prefs(line_user_id);

ALTER TABLE public.admin_line_prefs ENABLE ROW LEVEL SECURITY;
-- 只用 service-role 寫入 / 讀取（webhook 用 admin client）
DROP POLICY IF EXISTS alp_admin_only ON public.admin_line_prefs;
CREATE POLICY alp_admin_only ON public.admin_line_prefs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
