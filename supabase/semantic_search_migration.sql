-- 演算法 #9 — 全站語意搜尋（embeddings + pgvector）
-- 章節 / 副本 / 部落格文章 / 論壇主題 都做 embedding、跨類型語意 ranking

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.content_embeddings (
  id bigserial PRIMARY KEY,
  content_type text NOT NULL,           -- 'chapter' / 'dungeon' / 'blog' / 'forum_thread'
  content_id text NOT NULL,             -- chapter.id 字串化 / blog.slug / 等
  title text,
  snippet text,                         -- 顯示用 200 字摘要
  url text NOT NULL,                    -- 結果點擊去哪
  embedding vector(1536) NOT NULL,      -- OpenAI text-embedding-3-small (1536 dim)
  meta jsonb,                           -- 額外資料：author / tags / date / etc
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id)
);

-- ivfflat 近似搜尋索引（lists=100 適合 < 10萬條、後續長大可改 hnsw）
CREATE INDEX IF NOT EXISTS idx_embeddings_vec
  ON public.content_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_embeddings_type
  ON public.content_embeddings (content_type);

-- 公開讀取（搜尋是公開功能）、寫只能 service role
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS embeddings_public_read ON public.content_embeddings;
CREATE POLICY embeddings_public_read ON public.content_embeddings FOR SELECT
  USING (true);

-- 寫入只走 service role bypass、不開 RLS policy

-- RPC：給定 query embedding、回最相似的 top N
CREATE OR REPLACE FUNCTION public.search_content_by_embedding(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content_type text,
  content_id text,
  title text,
  snippet text,
  url text,
  similarity float,
  meta jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    e.title,
    e.snippet,
    e.url,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.meta
  FROM public.content_embeddings e
  WHERE (type_filter IS NULL OR e.content_type = type_filter)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON TABLE public.content_embeddings IS '演算法 #9 — 全站內容語意搜尋向量、用 OpenAI text-embedding-3-small';
COMMENT ON FUNCTION public.search_content_by_embedding IS '給定 query embedding 回最相似 top N、用 cosine distance (<=>)';
