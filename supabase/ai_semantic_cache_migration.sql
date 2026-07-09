-- 語意快取：在既有 ai_response_cache 上加向量欄位，讓「相似問題」也能命中快取（省 LLM 呼叫）。
-- 精確快取(question_hash)命中不到時，再用向量相似度在「相同情境」內找近似問題。
-- 依賴：pgvector（ai_embeddings_migration.sql 已建 extension）。

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.ai_response_cache
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ivfflat cosine 索引（資料量大時加速；lists 可依量調）
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_embedding
  ON public.ai_response_cache
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 在「相同情境」(tone / persona / chapter / lesson) 內，找語意最相近且相似度達門檻的快取。
-- 用 IS NOT DISTINCT FROM 讓 NULL 也能正確比對（NULL = NULL → true）。
CREATE OR REPLACE FUNCTION public.match_ai_cache(
  p_embedding vector(1536),
  p_tone text DEFAULT NULL,
  p_persona text DEFAULT NULL,
  p_chapter int DEFAULT NULL,
  p_lesson text DEFAULT NULL,
  p_threshold float DEFAULT 0.93,
  p_limit int DEFAULT 1
) RETURNS TABLE (id uuid, answer text, model_used text, similarity float) AS $$
  SELECT c.id, c.answer, c.model_used,
         1 - (c.embedding <=> p_embedding) AS similarity
  FROM public.ai_response_cache c
  WHERE c.embedding IS NOT NULL
    AND c.tone IS NOT DISTINCT FROM p_tone
    AND c.persona_id IS NOT DISTINCT FROM p_persona
    AND c.context_chapter_id IS NOT DISTINCT FROM p_chapter
    AND c.context_lesson_id IS NOT DISTINCT FROM p_lesson
    AND 1 - (c.embedding <=> p_embedding) >= p_threshold
  ORDER BY c.embedding <=> p_embedding
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.match_ai_cache(vector, text, text, int, text, float, int)
  TO authenticated, service_role;
