-- Creator Island Phase2 — embeddings RPCs（給 ci_fragments，E4 主動回憶 + E5 意外配對）
-- 仿 idea_surprising_pairs，但 workspace-scoped。冪等。

-- E5：意外配對（語意中間帶：表面遠、深層有張力）
CREATE OR REPLACE FUNCTION public.ci_surprising_pairs(
  p_workspace uuid,
  match_count int DEFAULT 8,
  min_sim float DEFAULT 0.28,
  max_sim float DEFAULT 0.55
)
RETURNS TABLE (a_id uuid, a_title text, b_id uuid, b_title text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT a.id, a.title, b.id, b.title, 1 - (a.embedding <=> b.embedding) AS similarity
  FROM public.ci_fragments a
  JOIN public.ci_fragments b ON a.id < b.id
  WHERE a.workspace_id = p_workspace AND b.workspace_id = p_workspace
    AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL
    AND 1 - (a.embedding <=> b.embedding) BETWEEN min_sim AND max_sim
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- E4：主動回憶（找跟某向量最近的碎片；p_embedding 傳 '[..]' 文字、內部 cast）
CREATE OR REPLACE FUNCTION public.ci_related_fragments(
  p_workspace uuid,
  p_embedding text,
  p_exclude uuid DEFAULT NULL,
  match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, title text, content text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT f.id, f.title, f.content, 1 - (f.embedding <=> p_embedding::vector) AS similarity
  FROM public.ci_fragments f
  WHERE f.workspace_id = p_workspace
    AND f.embedding IS NOT NULL
    AND (p_exclude IS NULL OR f.id <> p_exclude)
  ORDER BY f.embedding <=> p_embedding::vector
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.ci_surprising_pairs IS 'Creator Island E5：workspace 內語意意外配對';
COMMENT ON FUNCTION public.ci_related_fragments IS 'Creator Island E4：找語意相關的舊碎片（主動回憶）';
