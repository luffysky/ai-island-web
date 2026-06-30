-- 系列/專輯：把多個創作歸成一個系列；歌詞可歸成專輯。系列/專輯本身可再用 category 分類。
-- kind: 'series'(系列) | 'album'(專輯，給歌詞用)；category = 再分類（例：情歌/搖滾、或 都市奇幻/懸疑）。
CREATE TABLE IF NOT EXISTS public.ci_series (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'series',   -- series | album
  title         TEXT NOT NULL DEFAULT '未命名系列',
  description   TEXT NOT NULL DEFAULT '',
  cover_url     TEXT,
  category      TEXT NOT NULL DEFAULT '',          -- 再分類群組（空字串 = 未分類）
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_series_ws ON public.ci_series(workspace_id, kind, updated_at DESC);

ALTER TABLE public.ci_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_series_read ON public.ci_series;
CREATE POLICY ci_series_read ON public.ci_series FOR SELECT
  USING (user_id = auth.uid() OR public.ci_is_workspace_member(workspace_id));

-- 草稿 / 作品歸屬某系列 + 在系列內的排序
ALTER TABLE public.ci_drafts ADD COLUMN IF NOT EXISTS series_id    UUID REFERENCES public.ci_series(id) ON DELETE SET NULL;
ALTER TABLE public.ci_drafts ADD COLUMN IF NOT EXISTS series_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ci_works  ADD COLUMN IF NOT EXISTS series_id    UUID REFERENCES public.ci_series(id) ON DELETE SET NULL;
ALTER TABLE public.ci_works  ADD COLUMN IF NOT EXISTS series_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_ci_drafts_series ON public.ci_drafts(series_id);
CREATE INDEX IF NOT EXISTS idx_ci_works_series  ON public.ci_works(series_id);
