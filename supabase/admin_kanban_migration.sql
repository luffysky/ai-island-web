-- Admin Launchpad Kanban — 林董的「指揮中心」
-- 3 個 board：功能總覽 / 待辦 / 許願池
-- 每 board 內 3 個 column (TODO / DOING / DONE)、card 可跨 column 拖曳
-- card 用 category 標記分類（line_student / tg / discord / web / ai / cron / ...）

CREATE TABLE IF NOT EXISTS public.admin_kanban_boards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  emoji       TEXT,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  meta        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_kanban_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID NOT NULL REFERENCES public.admin_kanban_boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  emoji       TEXT,
  color       TEXT DEFAULT 'gray',     -- gray / blue / green / orange / red / purple
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, title)
);

CREATE TABLE IF NOT EXISTS public.admin_kanban_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id   UUID NOT NULL REFERENCES public.admin_kanban_columns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,                    -- 'line_student' / 'line_admin' / 'tg' / 'discord' / 'web_front' / 'web_admin' / 'ai' / 'cron' / 'idea' / ...
  labels      TEXT[] DEFAULT '{}',
  position    INTEGER NOT NULL DEFAULT 0,
  meta        JSONB DEFAULT '{}'::jsonb, -- estimated_hours / due_date / link / author / ...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON public.admin_kanban_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_category ON public.admin_kanban_cards(category);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON public.admin_kanban_columns(board_id, position);

-- updated_at auto trigger
CREATE OR REPLACE FUNCTION public.set_kanban_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kanban_cards_updated ON public.admin_kanban_cards;
CREATE TRIGGER trg_kanban_cards_updated
  BEFORE UPDATE ON public.admin_kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_kanban_cards_updated_at();

-- RLS：admin only（owner / admin role 或 is_owner=true）
ALTER TABLE public.admin_kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_kanban_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kanban_boards_admin ON public.admin_kanban_boards;
CREATE POLICY kanban_boards_admin ON public.admin_kanban_boards FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                                            AND (p.role IN ('admin','owner') OR p.is_owner = true))
);
DROP POLICY IF EXISTS kanban_columns_admin ON public.admin_kanban_columns;
CREATE POLICY kanban_columns_admin ON public.admin_kanban_columns FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                                            AND (p.role IN ('admin','owner') OR p.is_owner = true))
);
DROP POLICY IF EXISTS kanban_cards_admin ON public.admin_kanban_cards;
CREATE POLICY kanban_cards_admin ON public.admin_kanban_cards FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                                            AND (p.role IN ('admin','owner') OR p.is_owner = true))
);

-- 初始 seed：3 個 board + 各 3 columns（idempotent、ON CONFLICT DO NOTHING）
INSERT INTO public.admin_kanban_boards (slug, title, emoji, description, position) VALUES
  ('feature-master', '全功能總覽', '🗺️', '4 channel + 網站前後台 + AI + cron 所有功能 inventory', 0),
  ('todo',           '待辦事項', '✅', '林董 / 雪鑰要做的事、可拖曳跨 column', 1),
  ('wishlist',       '許願池', '✨', '想到什麼新功能就丟這、之後評估採納', 2)
ON CONFLICT (slug) DO NOTHING;

-- columns 用 DO block 動態建（要 reference board_id）
DO $$
DECLARE
  feature_id UUID;
  todo_id    UUID;
  wish_id    UUID;
BEGIN
  SELECT id INTO feature_id FROM public.admin_kanban_boards WHERE slug = 'feature-master';
  SELECT id INTO todo_id    FROM public.admin_kanban_boards WHERE slug = 'todo';
  SELECT id INTO wish_id    FROM public.admin_kanban_boards WHERE slug = 'wishlist';

  -- feature-master columns: 待開發 / 進行中 / 已上線
  INSERT INTO public.admin_kanban_columns (board_id, title, emoji, color, position) VALUES
    (feature_id, '待開發', '📝', 'gray',   0),
    (feature_id, '進行中', '🔨', 'blue',   1),
    (feature_id, '已上線', '✅', 'green',  2)
  ON CONFLICT (board_id, title) DO NOTHING;

  -- todo columns: TODO / DOING / DONE
  INSERT INTO public.admin_kanban_columns (board_id, title, emoji, color, position) VALUES
    (todo_id, 'TODO',  '📌', 'gray',  0),
    (todo_id, 'DOING', '🔥', 'orange', 1),
    (todo_id, 'DONE',  '✓',  'green', 2)
  ON CONFLICT (board_id, title) DO NOTHING;

  -- wishlist columns: 想法 / 評估中 / 採納
  INSERT INTO public.admin_kanban_columns (board_id, title, emoji, color, position) VALUES
    (wish_id, '想法',   '💡', 'purple', 0),
    (wish_id, '評估中', '🤔', 'blue',   1),
    (wish_id, '採納',   '🎯', 'green',  2)
  ON CONFLICT (board_id, title) DO NOTHING;
END $$;
