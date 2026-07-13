-- 機會島 V4 智慧雷達（安全版）：只從「人工curated 的來源(RSS/API)」抓 → 進「待審佇列」→ 人工核實才變成真機會。
-- 絕不讓 AI 亂捏資料：抓進來的都是 pending candidate、要後台按「核准」才 insert 進 opportunities（且標 unverified）。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/opportunity_radar_migration.sql

-- 來源清單（林董/小編手動維護的官方頁 RSS/API）
CREATE TABLE IF NOT EXISTS public.opportunity_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'rss' CHECK (kind IN ('rss','atom','api','sitemap','manual')),
  category_hint text,               -- 這來源多半屬哪類（AI/創業/補助…）→ 寫進 candidate 供參考
  enabled boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  last_status text,                 -- ok / 錯誤訊息
  last_count int DEFAULT 0,         -- 上次抓到幾筆「新的」
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opp_sources_enabled ON public.opportunity_sources(enabled);

-- 待審佇列（抓進來、還沒人工核實的候選機會）
CREATE TABLE IF NOT EXISTS public.opportunity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.opportunity_sources(id) ON DELETE SET NULL,
  source_name text,
  raw_title text NOT NULL,
  raw_url text,
  raw_summary text,
  raw_published_at timestamptz,
  parsed jsonb DEFAULT '{}'::jsonb,     -- 之後 AI 抽取結構化欄位放這（本版先空、人工核准時填）
  confidence numeric,                    -- 之後給信心分數（本版先 null）
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,  -- 核准後連到真機會
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 同一 URL 不重複進佇列（cron 冪等）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_opp_candidates_url ON public.opportunity_candidates(raw_url) WHERE raw_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opp_candidates_status ON public.opportunity_candidates(status, created_at DESC);

-- 這兩張是後台專用：開 RLS 但不給 policy = 只有 service role（後台 API）能存取、一般使用者碰不到。
ALTER TABLE public.opportunity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_candidates ENABLE ROW LEVEL SECURITY;
