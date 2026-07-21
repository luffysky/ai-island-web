-- 每日運勢 / AI 命理 schema
--  fortune_profiles：使用者生日資料（一人一列、user_id 當主鍵）
--  fortune_daily   ：同人同日快取（唯一鍵 user_id+date、payload jsonb）＝不重複燒 LLM
--  另加 profiles.line_pref_fortune 欄（每日運勢 LINE 推播訂閱偏好、預設開）
-- 跑法：node scripts/run-sql.mjs supabase/fortune_migration.sql

-- ── 1. 生日資料 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fortune_profiles (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_date    DATE NOT NULL,
  birth_time    TIME,                                   -- 時辰（八字用、可空；無時辰只算日主/星座）
  gender        TEXT CHECK (gender IN ('male','female','other')),
  calendar_type TEXT NOT NULL DEFAULT 'solar' CHECK (calendar_type IN ('solar','lunar')),
  zodiac        TEXT,                                   -- 西洋星座（依 birth_date 算、存起來方便查）
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fortune_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fortune_profiles_own_all ON public.fortune_profiles;
CREATE POLICY fortune_profiles_own_all ON public.fortune_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_fortune_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fortune_profiles_updated_at ON public.fortune_profiles;
CREATE TRIGGER trg_fortune_profiles_updated_at
  BEFORE UPDATE ON public.fortune_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_fortune_profile_updated_at();

-- ── 2. 每日運勢快取 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fortune_daily (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,                            -- 台北日 YYYY-MM-DD
  kind        TEXT NOT NULL DEFAULT 'daily',            -- daily | tarot（塔羅第二刀用）
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date, kind)
);

CREATE INDEX IF NOT EXISTS idx_fortune_daily_user_date
  ON public.fortune_daily(user_id, date);

ALTER TABLE public.fortune_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fortune_daily_own_read ON public.fortune_daily;
CREATE POLICY fortune_daily_own_read ON public.fortune_daily
  FOR SELECT USING (auth.uid() = user_id);
-- 寫入一律走 service_role（cron / API 生成）、不開 public write

-- ── 3. LINE 每日運勢推播偏好 ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_pref_fortune BOOLEAN NOT NULL DEFAULT true;
