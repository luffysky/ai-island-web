-- TODO list schema (L4: 含截止日 / 優先順序 / 子任務 / 拖曳排序 / 重複規則)
-- 每位用戶私有 todo、RLS user_id = auth.uid()

CREATE TABLE IF NOT EXISTS public.todos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES public.todos(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  notes         TEXT,
  completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  due_date      DATE,
  priority      SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  sort_order    DOUBLE PRECISION NOT NULL DEFAULT 0,
  recur_rule    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_active
  ON public.todos(user_id, completed, sort_order);

CREATE INDEX IF NOT EXISTS idx_todos_parent
  ON public.todos(parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS todos_own_all ON public.todos;
CREATE POLICY todos_own_all ON public.todos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_todo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_todos_updated_at ON public.todos;
CREATE TRIGGER trg_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.touch_todo_updated_at();
