-- ============================================================
-- 留言 / 回覆 按讚系統
-- 部落格留言（blog_comments）+ 討論區回覆（forum_replies）
-- ============================================================

-- ── 部落格留言按讚 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_comment_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_comment
  ON public.blog_comment_likes(comment_id);

-- ── 討論區回覆按讚 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_reply_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id    UUID NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_forum_reply_likes_reply
  ON public.forum_reply_likes(reply_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.blog_comment_likes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_likes   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_comment_likes_read" ON public.blog_comment_likes;
CREATE POLICY "blog_comment_likes_read" ON public.blog_comment_likes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "blog_comment_likes_own" ON public.blog_comment_likes;
CREATE POLICY "blog_comment_likes_own" ON public.blog_comment_likes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "forum_reply_likes_read" ON public.forum_reply_likes;
CREATE POLICY "forum_reply_likes_read" ON public.forum_reply_likes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "forum_reply_likes_own" ON public.forum_reply_likes;
CREATE POLICY "forum_reply_likes_own" ON public.forum_reply_likes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
