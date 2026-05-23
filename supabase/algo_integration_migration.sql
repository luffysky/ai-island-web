-- ============================================================
-- 批 18-19 整合 schema：ELO / Thompson / Leetcode link out
-- 在 Supabase SQL Editor 執行
-- ============================================================

-- ① ELO 自適應（演算法 #7）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS elo_rating INTEGER NOT NULL DEFAULT 1200;

ALTER TABLE public.leetcode_questions
  ADD COLUMN IF NOT EXISTS rating   INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leetcode_rating ON public.leetcode_questions(rating) WHERE active = true;

-- ② Thompson Sampling（演算法 #5）
ALTER TABLE public.ab_experiments
  ADD COLUMN IF NOT EXISTS allocation TEXT NOT NULL DEFAULT 'weighted'
    CHECK (allocation IN ('weighted', 'thompson'));

-- ③ Leetcode link out 模式（D 方案）— 純 metadata 表（不存題目本文、避免侵權）
CREATE TABLE IF NOT EXISTS public.leetcode_problems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      INTEGER UNIQUE,                -- leetcode # 編號
  slug        TEXT UNIQUE NOT NULL,           -- 'two-sum'
  title       TEXT NOT NULL,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  tags        TEXT[] DEFAULT '{}',
  is_premium  BOOLEAN NOT NULL DEFAULT false,
  url         TEXT NOT NULL,                  -- https://leetcode.com/problems/two-sum/
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lcp_diff ON public.leetcode_problems(difficulty) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_lcp_tags ON public.leetcode_problems USING gin(tags) WHERE active = true;

ALTER TABLE public.leetcode_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lcp_public_read ON public.leetcode_problems;
CREATE POLICY lcp_public_read ON public.leetcode_problems FOR SELECT USING (active = true);
DROP POLICY IF EXISTS lcp_admin_write ON public.leetcode_problems;
CREATE POLICY lcp_admin_write ON public.leetcode_problems FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- ④ 用戶解過的 leetcode 題（同步 leetcode-stats-api 或手動標記）
CREATE TABLE IF NOT EXISTS public.user_leetcode_solved (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.leetcode_problems(id) ON DELETE CASCADE,
  solved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, problem_id)
);

ALTER TABLE public.user_leetcode_solved ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS uls_self_select ON public.user_leetcode_solved;
CREATE POLICY uls_self_select ON public.user_leetcode_solved FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS uls_self_write ON public.user_leetcode_solved;
CREATE POLICY uls_self_write ON public.user_leetcode_solved FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS uls_self_delete ON public.user_leetcode_solved;
CREATE POLICY uls_self_delete ON public.user_leetcode_solved FOR DELETE USING (user_id = auth.uid());
