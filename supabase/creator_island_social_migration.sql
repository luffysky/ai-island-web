-- Creator Island 社群（參考 Insight 社群引擎，對接本專案 profiles/ci_ 慣例）。
-- 讚沿用 ci_likes(asset_id=post id)、通知沿用 notifications。新增貼文/限動/留言/收藏/好友/私訊。冪等。

-- ============ 貼文 ci_posts（post / article / reel 短影音）============
CREATE TABLE IF NOT EXISTS public.ci_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id  UUID REFERENCES public.ci_workspaces(id) ON DELETE SET NULL,
  type          TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post','article','reel')),
  title         TEXT,
  content       TEXT NOT NULL DEFAULT '',          -- TipTap HTML（article）/ 純文字（post）
  images        JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{url,alt?}]
  video_url     TEXT,
  video_thumbnail_url TEXT,
  audio_url     TEXT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  visibility    TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','private')),
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
  likes_count   INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  views_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_posts_feed ON public.ci_posts(status, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_posts_user ON public.ci_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_posts_reel ON public.ci_posts(type, created_at DESC) WHERE type = 'reel';

-- ============ 限動 ci_stories（24h 過期）============
CREATE TABLE IF NOT EXISTS public.ci_stories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url    TEXT,
  media_type   TEXT CHECK (media_type IN ('image','video')),
  caption      TEXT,
  canvas       JSONB,                              -- 文字/貼圖圖層（選用）
  visibility   TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
  view_count   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_stories_active ON public.ci_stories(is_active, expires_at) WHERE is_active;
CREATE TABLE IF NOT EXISTS public.ci_story_views (
  id BIGSERIAL PRIMARY KEY, story_id UUID NOT NULL REFERENCES public.ci_stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_story_views ON public.ci_story_views(story_id, viewer_id);

-- ============ 貼文留言 ci_post_comments（巢狀）============
CREATE TABLE IF NOT EXISTS public.ci_post_comments (
  id          BIGSERIAL PRIMARY KEY,
  post_id     UUID NOT NULL REFERENCES public.ci_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   BIGINT REFERENCES public.ci_post_comments(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  gif_url     TEXT,
  likes_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_post_comments_post ON public.ci_post_comments(post_id, created_at);

-- ============ 收藏 ci_bookmarks ============
CREATE TABLE IF NOT EXISTS public.ci_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.ci_posts(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_bookmarks ON public.ci_bookmarks(user_id, post_id);

-- ============ 好友系統 ci_friendships（邀請 / 接受 / 封鎖）============
CREATE TABLE IF NOT EXISTS public.ci_friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> addressee_id)
);
-- 一對使用者只一筆（不分方向）
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_friendships ON public.ci_friendships(LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_ci_friendships_addressee ON public.ci_friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_ci_friendships_requester ON public.ci_friendships(requester_id, status);
ALTER TABLE public.ci_friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_friendships_read ON public.ci_friendships;
CREATE POLICY ci_friendships_read ON public.ci_friendships FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ============ 私訊 ci_dm_threads / ci_dm_messages ============
CREATE TABLE IF NOT EXISTS public.ci_dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_lo UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- 兩人 id 排序後存（去重）
  user_hi UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_lo < user_hi)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_dm_threads ON public.ci_dm_threads(user_lo, user_hi);
CREATE TABLE IF NOT EXISTS public.ci_dm_messages (
  id BIGSERIAL PRIMARY KEY, thread_id UUID NOT NULL REFERENCES public.ci_dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT, media_url TEXT, media_type TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_dm_messages_thread ON public.ci_dm_messages(thread_id, created_at);

-- ============ RLS（公開內容可讀；私密 owner-only；寫走 service-role + 程式授權）============
ALTER TABLE public.ci_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_dm_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_posts_read ON public.ci_posts;
CREATE POLICY ci_posts_read ON public.ci_posts FOR SELECT USING (status='published' AND visibility IN ('public','followers') OR user_id = auth.uid());
DROP POLICY IF EXISTS ci_stories_read ON public.ci_stories;
CREATE POLICY ci_stories_read ON public.ci_stories FOR SELECT USING (is_active OR user_id = auth.uid());
DROP POLICY IF EXISTS ci_post_comments_read ON public.ci_post_comments;
CREATE POLICY ci_post_comments_read ON public.ci_post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS ci_bookmarks_read ON public.ci_bookmarks;
CREATE POLICY ci_bookmarks_read ON public.ci_bookmarks FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS ci_dm_threads_read ON public.ci_dm_threads;
CREATE POLICY ci_dm_threads_read ON public.ci_dm_threads FOR SELECT USING (user_lo = auth.uid() OR user_hi = auth.uid());
DROP POLICY IF EXISTS ci_dm_messages_read ON public.ci_dm_messages;
CREATE POLICY ci_dm_messages_read ON public.ci_dm_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ci_dm_threads t WHERE t.id = thread_id AND (t.user_lo = auth.uid() OR t.user_hi = auth.uid())));
