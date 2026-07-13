-- 分身島 pgvector RAG：把任務目標存成向量，新任務開跑前撈「語意相似的過去任務」當參考（省重工、記得你做過什麼）。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/agent_task_embedding_migration.sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 撈相似的過去成功任務（同一使用者、排除當前對話串）。相似度 = 1 - cosine 距離。
CREATE OR REPLACE FUNCTION public.match_agent_tasks(
  p_user_id uuid,
  p_embedding vector(1536),
  p_exclude_thread uuid,
  p_limit int
)
RETURNS TABLE(goal text, turn_summary text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT t.goal, t.turn_summary, 1 - (t.embedding <=> p_embedding) AS similarity
  FROM public.agent_tasks t
  WHERE t.user_id = p_user_id
    AND t.status = 'succeeded'
    AND t.embedding IS NOT NULL
    AND (p_exclude_thread IS NULL OR t.thread_id IS DISTINCT FROM p_exclude_thread)
  ORDER BY t.embedding <=> p_embedding
  LIMIT p_limit;
$$;
