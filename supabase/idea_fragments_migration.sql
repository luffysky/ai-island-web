-- 「給我一個點子」— 靈感碎片收集與重組系統
-- 兩張表：idea_fragments（碎片）+ generated_ideas（AI 重組出的點子）
-- 後台 owner / admin 專用、走 service-role（admin client 繞過 RLS）
-- RLS 仍開啟、policy 只放行 admin / owner（多一層保險）

-- ============ idea_fragments ============
CREATE TABLE IF NOT EXISTS public.idea_fragments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title          TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content        TEXT NOT NULL DEFAULT '',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  mood           TEXT,
  category       TEXT,
  ai_summary     TEXT,
  potential_uses TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idea_fragments_created
  ON public.idea_fragments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_idea_fragments_tags
  ON public.idea_fragments USING GIN (tags);

ALTER TABLE public.idea_fragments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idea_fragments_admin_all ON public.idea_fragments;
CREATE POLICY idea_fragments_admin_all ON public.idea_fragments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_owner = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_owner = true)
    )
  );

-- ============ generated_ideas ============
CREATE TABLE IF NOT EXISTS public.generated_ideas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  summary             TEXT NOT NULL DEFAULT '',
  idea_type           TEXT,
  source_fragment_ids UUID[] NOT NULL DEFAULT '{}',
  why_it_works        TEXT,
  next_steps          TEXT[] NOT NULL DEFAULT '{}',
  saved               BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_ideas_created
  ON public.generated_ideas(created_at DESC);

ALTER TABLE public.generated_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS generated_ideas_admin_all ON public.generated_ideas;
CREATE POLICY generated_ideas_admin_all ON public.generated_ideas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_owner = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.is_owner = true)
    )
  );

-- updated_at trigger（碎片）
CREATE OR REPLACE FUNCTION public.touch_idea_fragment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_idea_fragments_updated_at ON public.idea_fragments;
CREATE TRIGGER trg_idea_fragments_updated_at
  BEFORE UPDATE ON public.idea_fragments
  FOR EACH ROW EXECUTE FUNCTION public.touch_idea_fragment_updated_at();
