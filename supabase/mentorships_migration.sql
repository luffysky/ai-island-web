-- 學員配對（mentor / peer）
-- /me/mentor 申請：我要當 mentor / 我要找 mentor / 我要找 peer 一起學
-- 雪鑰根據程度 + 興趣自動配對

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  user_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('mentor','mentee','peer')), -- 想當 mentor / 找 mentor / 找 peer
  bio            TEXT,                                            -- 一段自介、想分享什麼 / 想學什麼
  topics         TEXT[] DEFAULT '{}',                             -- 'react','python','ai-engineering' 等
  availability   TEXT,                                            -- 'weekday night', 'weekend' 等簡單描述
  contact_method TEXT,                                            -- 'discord:xxx', 'line:xxx', 'email'
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_role ON public.mentor_profiles(role) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_topics ON public.mentor_profiles USING gin(topics) WHERE active = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_mentor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentor_profiles_updated ON public.mentor_profiles;
CREATE TRIGGER trg_mentor_profiles_updated
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_mentor_profiles_updated_at();

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- 自己讀寫自己
DROP POLICY IF EXISTS mentor_profiles_own ON public.mentor_profiles;
CREATE POLICY mentor_profiles_own ON public.mentor_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 所有登入 user 可讀 active profiles（找配對需要）
DROP POLICY IF EXISTS mentor_profiles_read_active ON public.mentor_profiles;
CREATE POLICY mentor_profiles_read_active ON public.mentor_profiles
  FOR SELECT TO authenticated USING (active = true);
