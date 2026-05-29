-- 模擬面試記錄
-- 學員每次按「結束面試」自動保存、可在 /me/mock-interview/history 看歷史

CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode            TEXT NOT NULL,             -- tech / behavior / system-design
  role            TEXT NOT NULL,             -- frontend / pm / designer / ...
  transcript      JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{role, content}, ...]
  overall_score   INTEGER,                   -- 0-100
  comment         TEXT,
  breakdown       JSONB DEFAULT '[]'::jsonb, -- [{aspect, score, note}]
  next_steps      JSONB DEFAULT '[]'::jsonb, -- ["...", "..."]
  duration_sec    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_intv_user ON public.mock_interview_sessions(user_id, created_at DESC);

ALTER TABLE public.mock_interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mock_intv_own ON public.mock_interview_sessions;
CREATE POLICY mock_intv_own ON public.mock_interview_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
