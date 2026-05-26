-- AI 嵌入向量（OpenAI text-embedding-3-small、1536 維、cosine 相似度）
-- 用途：學員 LINE AI 搜尋 lesson / forum 內容、admin 後台語意搜尋
-- backfill：scripts/backfill_lesson_embeddings.mjs

-- 1. enable pgvector extension（Supabase 已內建、只需啟用）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. lessons 加 embedding 欄位
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- IVFFlat 索引（cosine 相似度、lists=100 是 75 章 × 平均 8 lesson ≈ 600 個 row 的合理值）
-- 大表才需要 IVFFlat、本表 600 row 用 HNSW 或 brute force 都可、留索引以後好查
CREATE INDEX IF NOT EXISTS idx_lessons_embedding
  ON public.lessons USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- 3. forum_threads 加 embedding 欄位
ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_forum_threads_embedding
  ON public.forum_threads USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. RPC: match_lessons — 給定 query embedding 找最像的 lesson
CREATE OR REPLACE FUNCTION public.match_lessons(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  lesson_id TEXT,
  chapter_id INT,
  title TEXT,
  summary TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    l.id            AS lesson_id,
    l.chapter_id,
    l.title,
    COALESCE(l.one_line_summary, l.analogy, LEFT(l.content, 200)) AS summary,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM public.lessons l
  WHERE l.embedding IS NOT NULL
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 5. RPC: match_forum_threads — 給定 query embedding 找最像的論壇主題
CREATE OR REPLACE FUNCTION public.match_forum_threads(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  thread_id UUID,
  title TEXT,
  snippet TEXT,
  reply_count INT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    t.id            AS thread_id,
    t.title,
    LEFT(regexp_replace(COALESCE(t.content, ''), '<[^>]+>', '', 'g'), 200) AS snippet,
    t.reply_count,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.forum_threads t
  WHERE t.embedding IS NOT NULL
    AND (t.is_locked IS NULL OR t.is_locked = false)
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. 給 service_role 跑 RPC 權限（admin client 用）
GRANT EXECUTE ON FUNCTION public.match_lessons(vector, INT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.match_forum_threads(vector, INT) TO service_role, authenticated;

COMMENT ON COLUMN public.lessons.embedding IS
  'OpenAI text-embedding-3-small 1536 維、由 title + one_line_summary + analogy + content 串接後生成。NULL 表示尚未 backfill';
COMMENT ON COLUMN public.forum_threads.embedding IS
  'OpenAI text-embedding-3-small 1536 維、由 title + content 串接後生成';
