-- Creator Island — Fragment Intelligence Engine (FIE) M1–M5（依白皮書 Part II）
-- 旁掛新增、不改既有；寫入走 service-role（bypass RLS），故只開 SELECT policy（workspace 成員）。
-- 依賴：ci_fragments / ci_workspaces / ci_workspace_members / ci_agent_runs / ci_is_workspace_member()

CREATE EXTENSION IF NOT EXISTS vector;

-- ============ M1 Fragment Representation 分層 ============
CREATE TABLE IF NOT EXISTS public.ci_fragment_representations (
  fragment_id       UUID PRIMARY KEY REFERENCES public.ci_fragments(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  surface           JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {lang,len,keyphrases[],entities[]}
  semantic          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {themes[],sentiment,abstraction_level}
  structural        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {role,in_degree,out_degree,cluster_id}
  concept_embedding VECTOR(1536),
  rep_version       INT NOT NULL DEFAULT 1,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_frag_repr_ws ON public.ci_fragment_representations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ci_frag_repr_emb ON public.ci_fragment_representations USING ivfflat (concept_embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE public.ci_fragment_representations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_frag_repr_read ON public.ci_fragment_representations;
CREATE POLICY ci_frag_repr_read ON public.ci_fragment_representations FOR SELECT USING (public.ci_is_workspace_member(workspace_id));

-- ============ M2 Reasoning Run（一次推理一列，關聯 ci_agent_runs）============
CREATE TABLE IF NOT EXISTS public.ci_reasoning_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  agent_run_id  BIGINT REFERENCES public.ci_agent_runs(id),
  mode          TEXT NOT NULL DEFAULT 'familiar' CHECK (mode IN ('familiar','adjacent','exploratory')),
  input         JSONB NOT NULL,
  observation   JSONB,
  hypothesis    TEXT,
  evidence      JSONB,
  missing       JSONB,
  candidate     JSONB,                                  -- rank1 快照（M3 擴多筆）
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_reason_runs_ws ON public.ci_reasoning_runs(workspace_id, created_at DESC);
ALTER TABLE public.ci_reasoning_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_reason_runs_read ON public.ci_reasoning_runs;
CREATE POLICY ci_reason_runs_read ON public.ci_reasoning_runs FOR SELECT USING (public.ci_is_workspace_member(workspace_id));

-- ============ M3 Candidates（多筆對一 run）============
CREATE TABLE IF NOT EXISTS public.ci_reasoning_candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES public.ci_reasoning_runs(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL,
  rank          INT NOT NULL,
  content       JSONB NOT NULL,                          -- {title,body,rationale}
  confidence    NUMERIC(4,3) NOT NULL,
  weight        NUMERIC(6,4) NOT NULL,
  evidence_ids  UUID[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_reason_cand_run ON public.ci_reasoning_candidates(run_id, rank);
ALTER TABLE public.ci_reasoning_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_reason_cand_read ON public.ci_reasoning_candidates;
CREATE POLICY ci_reason_cand_read ON public.ci_reasoning_candidates FOR SELECT USING (public.ci_is_workspace_member(workspace_id));

-- ============ M5 Trace（逐階段步驟）============
CREATE TABLE IF NOT EXISTS public.ci_reasoning_trace (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES public.ci_reasoning_runs(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL,
  step_no       INT NOT NULL,
  stage         TEXT NOT NULL,   -- observation|hypothesis|evidence|missing|candidate|alignment
  detail        JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, step_no)
);
ALTER TABLE public.ci_reasoning_trace ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_reason_trace_read ON public.ci_reasoning_trace;
CREATE POLICY ci_reason_trace_read ON public.ci_reasoning_trace FOR SELECT USING (public.ci_is_workspace_member(workspace_id));

-- ============ M5 Feedback（採納/否決）============
CREATE TABLE IF NOT EXISTS public.ci_reasoning_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.ci_reasoning_candidates(id) ON DELETE CASCADE,
  run_id        UUID NOT NULL REFERENCES public.ci_reasoning_runs(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL,
  user_id       UUID NOT NULL,
  verdict       TEXT NOT NULL CHECK (verdict IN ('accepted','rejected','edited')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_reason_fb_run ON public.ci_reasoning_feedback(run_id);
ALTER TABLE public.ci_reasoning_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_reason_fb_read ON public.ci_reasoning_feedback;
CREATE POLICY ci_reason_fb_read ON public.ci_reasoning_feedback FOR SELECT USING (user_id = auth.uid() OR public.ci_is_workspace_member(workspace_id));
