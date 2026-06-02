-- GA4 analytics_snapshots：補齊更多 GA4 維度與指標
-- 每日指標
ALTER TABLE public.analytics_snapshots
  ADD COLUMN IF NOT EXISTS sessions         INT DEFAULT 0,            -- 工作階段
  ADD COLUMN IF NOT EXISTS engagement_rate  DECIMAL(5, 2) DEFAULT 0, -- 互動率 %
  ADD COLUMN IF NOT EXISTS new_users        INT DEFAULT 0;           -- 新使用者

-- 維度快取（皆 [{label, users}] 形式，僅存最新一天）
ALTER TABLE public.analytics_snapshots
  ADD COLUMN IF NOT EXISTS top_cities        JSONB DEFAULT '[]'::jsonb,  -- [{city, users}]
  ADD COLUMN IF NOT EXISTS top_channels      JSONB DEFAULT '[]'::jsonb,  -- [{channel, users}] 流量管道
  ADD COLUMN IF NOT EXISTS top_browsers      JSONB DEFAULT '[]'::jsonb,  -- [{browser, users}]
  ADD COLUMN IF NOT EXISTS top_os            JSONB DEFAULT '[]'::jsonb,  -- [{os, users}]
  ADD COLUMN IF NOT EXISTS top_languages     JSONB DEFAULT '[]'::jsonb,  -- [{language, users}]
  ADD COLUMN IF NOT EXISTS top_landing_pages JSONB DEFAULT '[]'::jsonb,  -- [{path, users}] 到達網頁
  ADD COLUMN IF NOT EXISTS new_vs_returning  JSONB DEFAULT '[]'::jsonb;  -- [{type, users}] 新/回訪
