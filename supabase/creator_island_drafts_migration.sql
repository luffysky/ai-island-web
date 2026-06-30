-- 創作引擎草稿（ci_drafts）：可直接開寫的成品草稿，完稿後轉成 ci_works。
-- 寫入走 server service-role + API guard（requireWorkspaceRole）；RLS 為讀取 backstop。
-- doc = 各類型專屬結構（章節大綱/角色卡/三幕/段落/意象…）；meta = suno/mv/genre 等。

CREATE TABLE IF NOT EXISTS public.ci_drafts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL,
  work_type          TEXT NOT NULL DEFAULT 'article',
  title              TEXT NOT NULL DEFAULT '未命名草稿',
  body               TEXT NOT NULL DEFAULT '',          -- TipTap HTML 正文
  doc                JSONB NOT NULL DEFAULT '{}'::jsonb, -- 類型專屬結構（大綱/角色/段落…）
  meta               JSONB NOT NULL DEFAULT '{}'::jsonb, -- suno/mv/genre…
  fragment_ids       UUID[] NOT NULL DEFAULT '{}',       -- 用到的素材碎片
  word_count         INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'draft',      -- draft | published | archived
  published_work_id  UUID REFERENCES public.ci_works(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_drafts_ws_updated ON public.ci_drafts(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_drafts_user        ON public.ci_drafts(user_id);

ALTER TABLE public.ci_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ci_drafts_read ON public.ci_drafts;
CREATE POLICY ci_drafts_read ON public.ci_drafts FOR SELECT
  USING (user_id = auth.uid() OR public.ci_is_workspace_member(workspace_id));
