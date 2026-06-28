-- Creator Island M2 — AI loop（agent_runs）。workspace_ai_settings 已在 M0 建。
-- 依 docs/ideas_os/07_AI_SYSTEM.md、13_DATABASE.md。冪等。

CREATE TABLE IF NOT EXISTS public.ci_agent_runs (
  id            BIGSERIAL PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_type    TEXT NOT NULL,
  input         JSONB,
  output        JSONB,
  provider      TEXT,
  model         TEXT,
  tokens_input  BIGINT NOT NULL DEFAULT 0,
  tokens_output BIGINT NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(12,6) NOT NULL DEFAULT 0,   -- 內部分析用（非使用者貨幣，使用者付 Z 幣）
  z_charged     INTEGER NOT NULL DEFAULT 0,         -- 實際扣的 Z 幣（核心動作預設 0、免費）
  status        TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  error         TEXT,
  created_assets TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_agent_runs_ws ON public.ci_agent_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_agent_runs_type ON public.ci_agent_runs(agent_type);

ALTER TABLE public.ci_agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_agent_runs_read ON public.ci_agent_runs;
CREATE POLICY ci_agent_runs_read ON public.ci_agent_runs FOR SELECT
  USING (public.ci_is_workspace_member(workspace_id));
