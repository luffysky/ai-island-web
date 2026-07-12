-- 機會島（Opportunity Island）V1 資料底層。泛化成 opportunities（type 分十層），一次到位、V2–V5 直接疊。
-- 冪等、加法。跑法：貼進 Supabase SQL editor。

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'competition',   -- competition|grant|scholarship|vc|callforentry|tender|job|internship|overseas|cert
  name text NOT NULL,
  organizer text,
  country text DEFAULT 'TW',
  category text,                               -- AI/創業/設計/音樂/黑客松...
  official_url text,
  description text,
  prize_amount bigint,                         -- 獎金數值（排序/篩選用；未知留 NULL）
  prize_text text,                             -- 獎金原文（顯示用）
  currency text DEFAULT 'TWD',
  application_start date,
  application_deadline date,
  is_free boolean DEFAULT true,                -- 免報名費
  requires_demo boolean DEFAULT false,
  requires_pitch boolean DEFAULT false,
  requires_video boolean DEFAULT false,
  requires_business_plan boolean DEFAULT false,
  requires_company boolean DEFAULT false,
  requires_student boolean DEFAULT false,
  eligibility text,
  ai_island_fit_score int,                     -- 規則引擎算的適合度 0-100（V2）
  tags text[] DEFAULT '{}',
  status text DEFAULT 'open',                  -- open|upcoming|closed
  source_confidence text DEFAULT 'unverified', -- unverified|verified（資料誠實：未核實就標明）
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opps_type ON public.opportunities(type, status);
CREATE INDEX IF NOT EXISTS idx_opps_deadline ON public.opportunities(application_deadline);

-- 我的航線（收藏 + 投件進度）
CREATE TABLE IF NOT EXISTS public.opportunity_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  stage text DEFAULT 'saved',                  -- saved|preparing|submitted|done
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);
CREATE INDEX IF NOT EXISTS idx_opp_routes_user ON public.opportunity_routes(user_id, created_at DESC);

-- RLS：機會人人可看；航線只有本人
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunities_read ON public.opportunities;
CREATE POLICY opportunities_read ON public.opportunities FOR SELECT USING (true);

ALTER TABLE public.opportunity_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opp_routes_own ON public.opportunity_routes;
CREATE POLICY opp_routes_own ON public.opportunity_routes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
