-- 學員每日目標表（/goal LINE 命令依賴）
-- user 用 /goal 5 設今日完成 5 個 lesson、/goal 查達成度
-- 一個 user 一天一筆、UPSERT 即覆蓋

CREATE TABLE IF NOT EXISTS public.user_daily_goals (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL,
  target_lessons INTEGER NOT NULL DEFAULT 1 CHECK (target_lessons BETWEEN 1 AND 20),
  target_quiz INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, goal_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_date ON public.user_daily_goals(goal_date DESC);

-- RLS：user 只能讀寫自己的、admin 全看
ALTER TABLE public.user_daily_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_daily_goals_own" ON public.user_daily_goals;
CREATE POLICY "user_daily_goals_own" ON public.user_daily_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_daily_goals_admin" ON public.user_daily_goals;
CREATE POLICY "user_daily_goals_admin" ON public.user_daily_goals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND (p.role IN ('admin','owner') OR p.is_owner = true)
    )
  );

-- updated_at auto trigger
CREATE OR REPLACE FUNCTION public.set_user_daily_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_daily_goals_updated ON public.user_daily_goals;
CREATE TRIGGER trg_user_daily_goals_updated
  BEFORE UPDATE ON public.user_daily_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_user_daily_goals_updated_at();
