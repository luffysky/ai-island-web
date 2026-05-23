-- 綠寶 AI 成本快取（依 docs/待閱/greenbao_ai_cost_spec_v0.md v0）
-- 精確問題快取：相同問題第二次秒回、不燒 token。

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT NOT NULL,                       -- 正規化問題的 SHA-256
  question_text TEXT NOT NULL,                       -- 原始問題（除錯 / 後台檢視用）
  answer        TEXT NOT NULL,                       -- AI 的完整回答
  tone          TEXT,
  persona_id    TEXT,
  context_chapter_id INT,
  context_lesson_id  TEXT,
  model_used    TEXT,                                -- 產生此答案的模型
  hit_count     INT NOT NULL DEFAULT 0,              -- 被命中幾次
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at   TIMESTAMPTZ,
  -- 命中條件的完整組合需唯一
  UNIQUE(question_hash, tone, persona_id, context_chapter_id, context_lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup
  ON public.ai_response_cache(question_hash);

CREATE INDEX IF NOT EXISTS idx_ai_cache_hits
  ON public.ai_response_cache(hit_count DESC);

-- RLS：此表只由 server（service_role）讀寫、admin 可看
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_cache_admin_select ON public.ai_response_cache;
CREATE POLICY ai_cache_admin_select ON public.ai_response_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- bump_cache_hit RPC：原子性 +1 + 更新 last_hit_at
CREATE OR REPLACE FUNCTION public.bump_cache_hit(p_cache_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_response_cache
  SET hit_count = hit_count + 1,
      last_hit_at = NOW()
  WHERE id = p_cache_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_cache_hit(UUID) TO service_role;
