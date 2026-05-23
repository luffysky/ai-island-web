-- S9 AI 導師個人化學習規劃
-- 每個 user 可有多個 plan（換職涯重生）、最新一份為「當前」。

CREATE TABLE IF NOT EXISTS public.learning_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  depth        TEXT NOT NULL CHECK (depth IN ('lazy','standard','detail')),
  career_path  TEXT,                                   -- frontend / fullstack / ai-engineer / data / freelance / indie
  goal         TEXT,                                    -- 用戶自填目標、例如「3 個月後能投前端職」
  schedule     TEXT,                                    -- weekday_30min / weekend_3h / hardcore
  plan_md      TEXT NOT NULL,                           -- AI 生的 markdown 計畫
  next_action  JSONB,                                   -- { chapter_id, lesson_id, reason }
  weekly_chapters JSONB DEFAULT '[]'::jsonb,            -- [{ week: 1, chapter_ids: [1,2], hours: 6 }, ...]
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  generated_by TEXT,                                    -- 用哪個模型生的
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_user_active ON public.learning_plans(user_id, created_at DESC) WHERE status = 'active';

ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lp_own_all ON public.learning_plans;
CREATE POLICY lp_own_all ON public.learning_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS lp_admin_select ON public.learning_plans;
CREATE POLICY lp_admin_select ON public.learning_plans
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
