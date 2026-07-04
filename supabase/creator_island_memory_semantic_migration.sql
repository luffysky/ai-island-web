-- Creator Island 記憶語意檢索（#92）：按相關性注入記憶，取代「最近用」。
-- ci_memories 已有 embedding vector(1536) + ivfflat。此 RPC 依查詢向量取最相關的 active 記憶。

CREATE OR REPLACE FUNCTION public.ci_memories_semantic(
  p_user       uuid,
  p_workspace  uuid,
  p_embedding  text,
  match_count  int DEFAULT 6
)
RETURNS TABLE (id uuid, kind text, text text, scope text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.kind, m.text, m.scope,
         1 - (m.embedding <=> p_embedding::vector) AS similarity
  FROM public.ci_memories m
  WHERE m.status = 'active'
    AND m.embedding IS NOT NULL
    AND (
         (m.scope = 'personal' AND m.user_id = p_user)
      OR (m.scope IN ('workspace','project') AND m.workspace_id = p_workspace)
    )
  ORDER BY m.embedding <=> p_embedding::vector
  LIMIT match_count;
$$;
COMMENT ON FUNCTION public.ci_memories_semantic IS 'Creator Island #92：依查詢向量取語意最相關的 active 記憶（注入 prompt 用）';
