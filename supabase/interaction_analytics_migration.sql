-- First-party interaction analytics for realtime admin visibility.

CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  current_path TEXT,
  current_title TEXT,
  referrer TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  timezone TEXT,
  locale TEXT,
  viewport_width INT,
  viewport_height INT,
  page_count INT NOT NULL DEFAULT 0,
  event_count INT NOT NULL DEFAULT 0,
  total_duration_sec INT NOT NULL DEFAULT 0,
  max_scroll_pct INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen
  ON public.analytics_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user
  ON public.analytics_sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor
  ON public.analytics_sessions(visitor_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_sec INT NOT NULL DEFAULT 0,
  scroll_max_pct INT NOT NULL DEFAULT 0,
  read_complete BOOLEAN NOT NULL DEFAULT false,
  viewport_width INT,
  viewport_height INT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  exit_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_started
  ON public.analytics_page_views(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_path
  ON public.analytics_page_views(path, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_user
  ON public.analytics_page_views(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session
  ON public.analytics_page_views(session_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  page_view_id TEXT REFERENCES public.analytics_page_views(id) ON DELETE CASCADE,
  visitor_id TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  path TEXT,
  value NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type
  ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON public.analytics_events(user_id, created_at DESC);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_sessions_admin_read" ON public.analytics_sessions;
CREATE POLICY "analytics_sessions_admin_read" ON public.analytics_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "analytics_page_views_admin_read" ON public.analytics_page_views;
CREATE POLICY "analytics_page_views_admin_read" ON public.analytics_page_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "analytics_events_admin_read" ON public.analytics_events;
CREATE POLICY "analytics_events_admin_read" ON public.analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.analytics_increment_session_page_count(
  p_session_id TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.analytics_sessions
  SET page_count = page_count + 1
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix-up for pre-existing installs that created id columns as UUID before front-end
-- IDs (page_<uuid>) were known to need TEXT (matches sessions.id). Safe on empty tables
-- and a no-op once columns are already TEXT.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'analytics_page_views'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_page_view_id_fkey;
    ALTER TABLE public.analytics_page_views ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.analytics_page_views ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.analytics_events ALTER COLUMN page_view_id TYPE TEXT USING page_view_id::text;
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_page_view_id_fkey
      FOREIGN KEY (page_view_id) REFERENCES public.analytics_page_views(id) ON DELETE CASCADE;
  END IF;
END $$;
