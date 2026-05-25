-- 補 forum_threads.like_count + forum_replies.like_count
-- API /api/forum/threads select 了 like_count、原 schema 沒、導致 500
ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_forum_threads_like_count ON public.forum_threads(like_count DESC);
