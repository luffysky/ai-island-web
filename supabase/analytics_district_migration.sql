-- Adds an optional 'district' field to interaction analytics so we can
-- record the suburb / 區 returned by reverse-geocoding precise GPS.
-- IP-based geo only goes to city. This column gets populated only when
-- the user explicitly opts in via /settings.

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS district TEXT;

ALTER TABLE public.analytics_page_views
  ADD COLUMN IF NOT EXISTS district TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_district
  ON public.analytics_sessions(district)
  WHERE district IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_district
  ON public.analytics_page_views(district)
  WHERE district IS NOT NULL;
