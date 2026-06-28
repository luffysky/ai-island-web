-- Creator Island Phase2 — Community（follow/collect/like/comment + fork/remix 走 ci_asset_relations）。
-- notifications 沿用既有表（只加 kind 值）。冪等。

CREATE TABLE IF NOT EXISTS public.ci_follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('creator','studio')),
  target_id   UUID NOT NULL,   -- 多型（creator=user_id / studio=workspace_id）
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_follows ON public.ci_follows(follower_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS public.ci_collects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id   UUID NOT NULL,
  asset_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_collects ON public.ci_collects(user_id, asset_id);

CREATE TABLE IF NOT EXISTS public.ci_likes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id   UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_likes ON public.ci_likes(user_id, asset_id);

CREATE TABLE IF NOT EXISTS public.ci_comments (
  id         BIGSERIAL PRIMARY KEY,
  asset_id   UUID NOT NULL,
  asset_type TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  parent_id  BIGINT REFERENCES public.ci_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_comments_asset ON public.ci_comments(asset_id, created_at);

ALTER TABLE public.ci_follows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_collects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_follows_read ON public.ci_follows;
CREATE POLICY ci_follows_read ON public.ci_follows FOR SELECT USING (true);   -- 追蹤數公開
DROP POLICY IF EXISTS ci_collects_read ON public.ci_collects;
CREATE POLICY ci_collects_read ON public.ci_collects FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS ci_likes_read ON public.ci_likes;
CREATE POLICY ci_likes_read ON public.ci_likes FOR SELECT USING (true);       -- 讚數公開
DROP POLICY IF EXISTS ci_comments_read ON public.ci_comments;
CREATE POLICY ci_comments_read ON public.ci_comments FOR SELECT USING (true); -- 公開資產留言可見
