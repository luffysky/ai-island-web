-- Creator Island M4 — Memory + Dust。依 07/08/13 docs。冪等。
-- ci_memories 與既有 user_ai_memory「分開」（用途不同）。

CREATE EXTENSION IF NOT EXISTS vector;

-- ============ ci_memories（scoped；personal=user_id、workspace/project=workspace_id）============
CREATE TABLE IF NOT EXISTS public.ci_memories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        TEXT NOT NULL CHECK (scope IN ('personal','workspace','project','session')),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  scope_ref    UUID,                         -- project id 等
  kind         TEXT NOT NULL DEFAULT 'note', -- style/tone/motif/rule/note...
  text         TEXT NOT NULL,
  embedding    vector(1536),
  confidence   NUMERIC(4,3) NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('candidate','active','rejected','expired')),
  source       TEXT NOT NULL DEFAULT 'user', -- user / agent_run
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ci_memories_personal ON public.ci_memories(user_id, status) WHERE scope = 'personal';
CREATE INDEX IF NOT EXISTS idx_ci_memories_ws ON public.ci_memories(workspace_id, status) WHERE scope IN ('workspace','project');
CREATE INDEX IF NOT EXISTS idx_ci_memories_embedding ON public.ci_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

ALTER TABLE public.ci_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_memories_read ON public.ci_memories;
CREATE POLICY ci_memories_read ON public.ci_memories FOR SELECT
  USING (
    (scope = 'personal' AND user_id = auth.uid())
    OR (scope IN ('workspace','project') AND workspace_id IS NOT NULL AND public.ci_is_workspace_member(workspace_id))
  );

-- ============ ci_memory_usage（透明度：哪些記憶被注入哪個 run）============
CREATE TABLE IF NOT EXISTS public.ci_memory_usage (
  id           BIGSERIAL PRIMARY KEY,
  memory_id    UUID NOT NULL REFERENCES public.ci_memories(id) ON DELETE CASCADE,
  agent_run_id BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_memory_usage_run ON public.ci_memory_usage(agent_run_id);
ALTER TABLE public.ci_memory_usage ENABLE ROW LEVEL SECURITY;

-- ============ ci_dust_ledger（創作資源，非金錢；與 coin_transactions 分開）============
CREATE TABLE IF NOT EXISTS public.ci_dust_ledger (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id  UUID REFERENCES public.ci_workspaces(id) ON DELETE SET NULL,
  amount        INTEGER NOT NULL,            -- 正=賺、負=花
  balance_after INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_dust_user ON public.ci_dust_ledger(user_id, created_at DESC);
ALTER TABLE public.ci_dust_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_dust_read ON public.ci_dust_ledger;
CREATE POLICY ci_dust_read ON public.ci_dust_ledger FOR SELECT USING (user_id = auth.uid());

-- 原子 Dust 異動（每日免費發放 / 開蛋扣）。amount 正=發、負=花。
CREATE OR REPLACE FUNCTION public.ci_dust_tx(
  p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_meta JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal INTEGER; v_after INTEGER;
BEGIN
  SELECT COALESCE((SELECT balance_after FROM public.ci_dust_ledger WHERE user_id=p_user_id ORDER BY id DESC LIMIT 1), 0) INTO v_bal;
  v_after := v_bal + p_amount;
  IF v_after < 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'insufficient_dust', 'balance', v_bal); END IF;
  INSERT INTO public.ci_dust_ledger(user_id, amount, balance_after, reason, meta)
  VALUES (p_user_id, p_amount, v_after, p_reason, p_meta);
  RETURN jsonb_build_object('ok', true, 'balance_after', v_after);
END;
$$;
