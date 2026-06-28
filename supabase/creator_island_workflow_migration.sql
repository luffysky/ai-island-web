-- Creator Island Phase2 — E7 工作流（錄製）。依 09 docs（精簡 v1：record + save + replay）。冪等。

CREATE TABLE IF NOT EXISTS public.ci_workflows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  TEXT NOT NULL DEFAULT '',
  steps        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{agent, params}]
  version      INTEGER NOT NULL DEFAULT 1,
  visibility   TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','workspace','public','marketplace')),
  is_template  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_workflows_ws ON public.ci_workflows(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ci_workflow_runs (
  id           BIGSERIAL PRIMARY KEY,
  workflow_id  UUID NOT NULL REFERENCES public.ci_workflows(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  started_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  input        JSONB,
  status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  result       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_workflow_runs_wf ON public.ci_workflow_runs(workflow_id, created_at DESC);

ALTER TABLE public.ci_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_workflow_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_workflows_read ON public.ci_workflows;
CREATE POLICY ci_workflows_read ON public.ci_workflows FOR SELECT
  USING (visibility IN ('public','marketplace') OR public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_workflow_runs_read ON public.ci_workflow_runs;
CREATE POLICY ci_workflow_runs_read ON public.ci_workflow_runs FOR SELECT
  USING (public.ci_is_workspace_member(workspace_id));
