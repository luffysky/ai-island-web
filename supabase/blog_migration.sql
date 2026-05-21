-- ============================================================
-- 部落格系統（移植自 Insight、適配 AI Island）
-- 變更：admin_users → profiles、移除 tenant_id 多租戶
-- 涵蓋：部落格設定 / 文章 / 系列 / 留言 / reactions / 訂閱 / 分類 / 全文搜尋
-- ============================================================

-- ── 1. 部落格設定（每位用戶一個部落格）──────────────────────
CREATE TABLE IF NOT EXISTS public.user_blog_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  blog_slug   TEXT UNIQUE,                 -- 自訂網址、NULL 時用 user_id
  blog_title  TEXT,
  blog_desc   TEXT,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_blog_settings_slug
  ON public.user_blog_settings(blog_slug) WHERE blog_slug IS NOT NULL;

-- ── 2. 系列（連載）──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_series (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  cover_image  TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blog_series_user ON public.blog_series(user_id);

-- ── 3. 文章 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_blog_articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  summary       TEXT,
  content       TEXT NOT NULL DEFAULT '',   -- TipTap HTML
  cover_image   TEXT,
  cover_image_position TEXT DEFAULT 'center center',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  category      TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT true,
  view_count    INT NOT NULL DEFAULT 0,
  seo_title     TEXT,
  seo_desc      TEXT,
  series_id     UUID REFERENCES public.blog_series(id) ON DELETE SET NULL,
  series_order  INT,
  search_vector tsvector,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_articles_user    ON public.user_blog_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_articles_public  ON public.user_blog_articles(user_id, is_public);
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug    ON public.user_blog_articles(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_articles_series  ON public.user_blog_articles(series_id, series_order);
CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON public.user_blog_articles(category) WHERE category IS NOT NULL;

-- ── 4. 留言（支援巢狀回覆）──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    UUID NOT NULL REFERENCES public.user_blog_articles(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id),
  author_name   TEXT NOT NULL DEFAULT '匿名訪客',
  author_email  TEXT,
  author_avatar TEXT,
  content       TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  is_approved   BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blog_comments_article ON public.blog_comments(article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent  ON public.blog_comments(parent_id);

-- ── 5. 表情回應 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES public.user_blog_articles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '❤️',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, fingerprint, emoji)
);
CREATE INDEX IF NOT EXISTS idx_blog_reactions_article ON public.blog_reactions(article_id);

-- ── 6. 訂閱者 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  name              TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  verify_token      TEXT,
  unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blog_user_id, email)
);
CREATE INDEX IF NOT EXISTS idx_blog_subscribers_blog
  ON public.blog_subscribers(blog_user_id);
CREATE INDEX IF NOT EXISTS idx_blog_subscribers_unsub
  ON public.blog_subscribers(unsubscribe_token);

-- ── 7. 全文搜尋（trigger 自動維護 search_vector）────────────
UPDATE public.user_blog_articles SET search_vector =
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'B');

CREATE INDEX IF NOT EXISTS idx_blog_search_vector
  ON public.user_blog_articles USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.blog_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blog_search_vector ON public.user_blog_articles;
CREATE TRIGGER trg_blog_search_vector
  BEFORE INSERT OR UPDATE OF title, summary, tags ON public.user_blog_articles
  FOR EACH ROW EXECUTE FUNCTION public.blog_search_vector_update();

-- ── 8. RLS ──────────────────────────────────────────────────
ALTER TABLE public.user_blog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_series        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_reactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_subscribers   ENABLE ROW LEVEL SECURITY;

-- 部落格設定：本人可改、啟用的公開可讀
DROP POLICY IF EXISTS "blog_settings_public_read" ON public.user_blog_settings;
CREATE POLICY "blog_settings_public_read" ON public.user_blog_settings
  FOR SELECT USING (is_enabled = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "blog_settings_own_write" ON public.user_blog_settings;
CREATE POLICY "blog_settings_own_write" ON public.user_blog_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 文章：公開的大家可讀、本人可讀寫全部
DROP POLICY IF EXISTS "blog_articles_public_read" ON public.user_blog_articles;
CREATE POLICY "blog_articles_public_read" ON public.user_blog_articles
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "blog_articles_own_write" ON public.user_blog_articles;
CREATE POLICY "blog_articles_own_write" ON public.user_blog_articles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 系列：公開可讀、本人可寫
DROP POLICY IF EXISTS "blog_series_public_read" ON public.blog_series;
CREATE POLICY "blog_series_public_read" ON public.blog_series
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_series_own_write" ON public.blog_series;
CREATE POLICY "blog_series_own_write" ON public.blog_series
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 留言：已核可的公開可讀；新增統一走 Next API（service role 會繞過 RLS）
DROP POLICY IF EXISTS "blog_comments_read" ON public.blog_comments;
CREATE POLICY "blog_comments_read" ON public.blog_comments
  FOR SELECT USING (is_approved = true);
DROP POLICY IF EXISTS "blog_comments_insert" ON public.blog_comments;
CREATE POLICY "blog_comments_insert" ON public.blog_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "blog_comments_own_delete" ON public.blog_comments;
CREATE POLICY "blog_comments_own_delete" ON public.blog_comments
  FOR DELETE USING (auth.uid() = user_id);

-- reactions：公開可讀；匿名 fingerprint 寫入統一走 Next API
DROP POLICY IF EXISTS "blog_reactions_read" ON public.blog_reactions;
CREATE POLICY "blog_reactions_read" ON public.blog_reactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_reactions_insert" ON public.blog_reactions;
CREATE POLICY "blog_reactions_insert" ON public.blog_reactions
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "blog_reactions_delete" ON public.blog_reactions;
CREATE POLICY "blog_reactions_delete" ON public.blog_reactions
  FOR DELETE TO authenticated USING (false);

-- 訂閱者：部落格主可看自己的訂閱者；公開訂閱統一走 Next API
DROP POLICY IF EXISTS "blog_subscribers_owner_read" ON public.blog_subscribers;
CREATE POLICY "blog_subscribers_owner_read" ON public.blog_subscribers
  FOR SELECT USING (auth.uid() = blog_user_id);
DROP POLICY IF EXISTS "blog_subscribers_insert" ON public.blog_subscribers;
CREATE POLICY "blog_subscribers_insert" ON public.blog_subscribers
  FOR INSERT TO authenticated WITH CHECK (false);

-- ── 9. 瀏覽數 +1 RPC ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inc_blog_view(p_article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_blog_articles
  SET view_count = view_count + 1
  WHERE id = p_article_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.inc_blog_view(UUID) TO anon, authenticated;
