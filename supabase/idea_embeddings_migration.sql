-- 「給我一個點子」第四階段：embeddings 真關聯發現
-- 幫每個碎片算語意向量，用「中間相似帶」找出表面無關、深層卻共振的意外配對。

CREATE EXTENSION IF NOT EXISTS vector;

-- 碎片語意向量（OpenAI text-embedding-3-small 1536 維）
ALTER TABLE public.idea_fragments
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_idea_fragments_embedding
  ON public.idea_fragments
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- RPC：找「意外配對」——相似度落在中間帶（太高=重複、太低=無關，中間才是驚喜）
-- 回傳碎片 id/title 對 + 相似度，依相似度高到低（驚喜帶內最強的先）
CREATE OR REPLACE FUNCTION public.idea_surprising_pairs(
  match_count int DEFAULT 8,
  min_sim float DEFAULT 0.28,
  max_sim float DEFAULT 0.55,
  folder uuid DEFAULT NULL
)
RETURNS TABLE (
  a_id uuid, a_title text,
  b_id uuid, b_title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id, a.title,
    b.id, b.title,
    1 - (a.embedding <=> b.embedding) AS similarity
  FROM public.idea_fragments a
  JOIN public.idea_fragments b ON a.id < b.id
  WHERE a.embedding IS NOT NULL
    AND b.embedding IS NOT NULL
    AND (folder IS NULL OR (a.folder_id = folder AND b.folder_id = folder))
    AND 1 - (a.embedding <=> b.embedding) BETWEEN min_sim AND max_sim
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.idea_surprising_pairs IS '給我一個點子：找語意中間帶的意外碎片配對（驚喜連結引擎）';
