-- 「給我一個點子」第三階段：資料夾分類 + 碎片關聯理由
-- 1. idea_folders：碎片分組（如「我的碎片」「Nami 的碎片」）
-- 2. idea_fragments.folder_id：碎片歸屬資料夾
-- 3. generated_ideas.connections：AI 說明「為什麼這些碎片值得組合」的具體關聯線

-- ============ idea_folders ============
CREATE TABLE IF NOT EXISTS public.idea_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  color       TEXT,                       -- 可存 emoji 或 hex 色
  sort_order  DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.idea_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idea_folders_admin_all ON public.idea_folders;
CREATE POLICY idea_folders_admin_all ON public.idea_folders
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_owner = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.is_owner = true)));

-- ============ idea_fragments.folder_id ============
ALTER TABLE public.idea_fragments
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.idea_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_idea_fragments_folder
  ON public.idea_fragments(folder_id) WHERE folder_id IS NOT NULL;

-- ============ generated_ideas.connections ============
ALTER TABLE public.generated_ideas
  ADD COLUMN IF NOT EXISTS connections TEXT[] NOT NULL DEFAULT '{}';
