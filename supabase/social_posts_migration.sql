-- 社群媒體發布中心：跨平台貼文草稿 / 排程 / 已發布 紀錄。
-- 你自己發、或 AI 起草→你批准→發，都走這張表。實際送到各平台需該平台 OAuth（分階段接）。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/social_posts_migration.sql

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  media_urls text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',   -- instagram/facebook/line/threads/tiktok/xiaohongshu/youtube/dcard/x/telegram/discord
  status text NOT NULL DEFAULT 'draft',       -- draft / scheduled / published / failed
  scheduled_at timestamptz,
  published_at timestamptz,
  source text NOT NULL DEFAULT 'me',           -- me（你自己寫）/ ai（分身起草）
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS social_posts_own ON public.social_posts;
CREATE POLICY social_posts_own ON public.social_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS social_posts_user_idx ON public.social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_sched_idx ON public.social_posts(status, scheduled_at) WHERE status = 'scheduled';
