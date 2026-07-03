-- match_content_embeddings — 全站語意搜尋 RPC
-- content_embeddings 已存在（見 semantic_search_migration.sql）。
-- 這支是搜尋頁 / /api/search 用的主 RPC：
--   * cosine 相似度 = 1 - (embedding <=> p_embedding)
--   * p_types 可帶類型白名單（text[]）過濾；NULL 或空陣列 = 全部類型
--   * 依 cosine distance (<=>) 排序、走 ivfflat 索引（idx_embeddings_vec）
--
-- 套用：node scripts/apply_match_content_embeddings.mjs   或   psql < 這個檔
-- 對應前端：src/app/api/search/route.ts

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.match_content_embeddings(
  p_embedding vector(1536),
  p_limit int DEFAULT 10,
  p_types text[] DEFAULT NULL
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
LANGUAGE sql
STABLE
-- ivfflat.probes 拉高 = 掃更多 list ≈ 精確 recall。
-- content_embeddings 是小表（章節/副本/部落格/論壇、量級數千），
-- 掃滿也 < 幾十 ms，換來的是不會漏掉高相似度結果（小表用 ivfflat approx 容易漏）。
SET ivfflat.probes = 100
AS $$
  SELECT
    e.id,
    e.content_type,
    e.content_id,
    e.title,
    e.snippet,
    e.url,
    1 - (e.embedding <=> p_embedding) AS similarity,
    e.meta
  FROM public.content_embeddings e
  WHERE (
    p_types IS NULL
    OR array_length(p_types, 1) IS NULL
    OR e.content_type = ANY (p_types)
  )
  ORDER BY e.embedding <=> p_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

COMMENT ON FUNCTION public.match_content_embeddings(vector, int, text[]) IS
  '全站語意搜尋：給 query embedding 回最相似 top N（cosine）。p_types = 類型白名單、NULL/空 = 全部。';

-- 公開搜尋：讓 anon / authenticated / service_role 都能呼叫
GRANT EXECUTE ON FUNCTION public.match_content_embeddings(vector, int, text[])
  TO anon, authenticated, service_role;
