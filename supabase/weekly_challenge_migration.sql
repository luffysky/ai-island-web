-- 週賽 Code Challenge
-- 每週 1 題、學員提交 code、AI 評分、leaderboard
-- 題目用既有 leetcode_problems、不另存 challenge 表

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_iso      TEXT NOT NULL,              -- '2026-W22'
  problem_id    UUID NOT NULL REFERENCES public.leetcode_problems(id) ON DELETE CASCADE,
  language      TEXT NOT NULL DEFAULT 'python',
  code          TEXT NOT NULL,
  score         INTEGER,                    -- 0-100、AI 評分
  comment       TEXT,                       -- AI 評論
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_iso)                -- 每 user 每週只能 1 submission（之後可改成最高分保留）
);

CREATE INDEX IF NOT EXISTS idx_chal_subs_week ON public.challenge_submissions(week_iso);
CREATE INDEX IF NOT EXISTS idx_chal_subs_user ON public.challenge_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_chal_subs_score ON public.challenge_submissions(score DESC) WHERE score IS NOT NULL;

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- user 可讀寫自己的
DROP POLICY IF EXISTS chal_subs_own ON public.challenge_submissions;
CREATE POLICY chal_subs_own ON public.challenge_submissions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 所有 authenticated user 可讀其他人 submission（leaderboard 需要）
DROP POLICY IF EXISTS chal_subs_read_all ON public.challenge_submissions;
CREATE POLICY chal_subs_read_all ON public.challenge_submissions
  FOR SELECT TO authenticated USING (true);
