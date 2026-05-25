-- ========================================================================
-- 行銷系統 — drafts / utm / affiliate / brand / competitor / ad campaigns
-- 用途：後台一站式管理文案 / 排程 / 多平台發佈 / 廣告 / 推薦碼 / 競品
-- ========================================================================

-- A. 行銷 drafts (文案稿、可排程)
CREATE TABLE IF NOT EXISTS public.marketing_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  topic         TEXT,                            -- 主題 (例：新章節 ch75 上線)
  platforms     TEXT[] NOT NULL DEFAULT '{}',    -- ['facebook','instagram','x','threads','line','blog','email']
  contents      JSONB NOT NULL DEFAULT '{}',     -- {facebook: "...", instagram: "...", x: "..."}
  media_urls    TEXT[] DEFAULT '{}',             -- 圖 / 影片 URL
  hashtags      TEXT[] DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','publishing','published','failed','archived')),
  scheduled_at  TIMESTAMPTZ,                     -- 排程發佈時間
  published_at  TIMESTAMPTZ,                     -- 實際發佈時間
  publish_log   JSONB DEFAULT '{}',              -- 各平台發佈結果 / 錯誤 / 連結
  utm_campaign  TEXT,                            -- UTM campaign name
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_status ON public.marketing_drafts (status);
CREATE INDEX IF NOT EXISTS idx_marketing_drafts_scheduled ON public.marketing_drafts (scheduled_at) WHERE status = 'scheduled';

-- B. UTM links (短連結 + 點擊統計)
CREATE TABLE IF NOT EXISTS public.utm_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code    TEXT UNIQUE NOT NULL,            -- 'spring24' 之類
  name          TEXT,                            -- 內部稱呼
  dest_url      TEXT NOT NULL,                   -- 真正去的 URL
  utm_source    TEXT,                            -- facebook / google / line / newsletter
  utm_medium    TEXT,                            -- social / cpc / email / banner
  utm_campaign  TEXT,                            -- 春季促銷
  utm_term      TEXT,
  utm_content   TEXT,
  click_count   INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,      -- by ip
  conversion    INTEGER NOT NULL DEFAULT 0,      -- 帶下單 / 註冊
  revenue       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_utm_links_short_code ON public.utm_links (short_code) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_utm_links_campaign ON public.utm_links (utm_campaign);

-- C. 廣告 copy (Meta Ads / Google Ads 的 ad set)
CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL                    -- 'meta' / 'google' / 'tiktok'
                  CHECK (platform IN ('meta','google','tiktok','line_ads')),
  campaign_name TEXT,
  goal          TEXT,                            -- 'awareness' / 'traffic' / 'conversion' / 'leads'
  audience      TEXT,                            -- 受眾描述
  headlines     TEXT[] DEFAULT '{}',             -- 多個標題 A/B
  primary_text  TEXT,                            -- 主文案
  descriptions  TEXT[] DEFAULT '{}',             -- 描述 (Google 限 30 字)
  cta           TEXT,                            -- 'shop_now' / 'learn_more' / 'sign_up'
  landing_url   TEXT,
  budget_ntd    NUMERIC(10,2),
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','ready','running','paused','completed','archived')),
  performance   JSONB DEFAULT '{}',              -- 後續手動 / API 同步進來的 impression / click / cost / conversion
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON public.ad_creatives (status);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_platform ON public.ad_creatives (platform);

-- D. 推薦碼 / Affiliate
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,          -- 推薦碼 (NAMI20 / OWNER30 之類)
  owner_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_name      TEXT,                          -- 對外顯示名 (KOL / 員工 / partner)
  description     TEXT,
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  discount_pct    NUMERIC(5,2) DEFAULT 0,        -- 用戶套用可享折扣
  max_uses        INTEGER,                       -- 上限 (null = 無限)
  click_count     INTEGER NOT NULL DEFAULT 0,
  conversion      INTEGER NOT NULL DEFAULT 0,
  revenue         NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON public.affiliate_codes (code) WHERE enabled = true;

-- E. 品牌風格庫 (brand voice / 模板)
CREATE TABLE IF NOT EXISTS public.brand_voice (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  brand_name    TEXT NOT NULL DEFAULT 'AI 島',
  tagline       TEXT,
  description   TEXT,                            -- 整段品牌介紹
  voice_tone    TEXT,                            -- '親切活潑、繁中台灣口語、學長學姊感、不要官話、適度 emoji'
  do_words      TEXT[] DEFAULT '{}',             -- 鼓勵用的詞 ('學員', '一起', '冒險')
  dont_words    TEXT[] DEFAULT '{}',             -- 避免用的詞 ('客戶', '購買', '完美')
  signature     TEXT,                            -- 結尾簽名
  hashtag_pool  TEXT[] DEFAULT '{}',             -- 預設 hashtag 池
  asset_urls    JSONB DEFAULT '{}',              -- {logo, og_image, brand_color}
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT brand_voice_singleton CHECK (id = 1)
);

INSERT INTO public.brand_voice (id, brand_name, tagline, voice_tone)
VALUES (1, 'AI 島', '繁體中文程式自學平台、跟 AI 寵物一起冒險',
  '親切活潑、繁中台灣口語、學長學姊感、適度 emoji、不端官話、不講「客戶」「購買」這種商業冷詞、用「學員」「一起」「冒險」等溫暖詞')
ON CONFLICT (id) DO NOTHING;

-- F. 競品 snapshots
CREATE TABLE IF NOT EXISTS public.competitor_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                   -- 'Codecademy' / 'Hahow' / etc
  url           TEXT,
  category      TEXT,                            -- 'edu' / 'ai' / 'self-learn'
  pricing_json  JSONB,                           -- 抓到的價格資訊
  features      TEXT[],                          -- 主要功能列表
  notes         TEXT,                            -- 內部分析筆記
  threat_level  TEXT
                  CHECK (threat_level IN ('low','medium','high','direct')),
  snapshot_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_at ON public.competitor_snapshots (snapshot_at DESC);

-- ============ RLS ============
ALTER TABLE public.marketing_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;

-- admin / owner 可全管
DROP POLICY IF EXISTS marketing_drafts_admin_all ON public.marketing_drafts;
CREATE POLICY marketing_drafts_admin_all ON public.marketing_drafts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')));

DROP POLICY IF EXISTS utm_links_admin_all ON public.utm_links;
CREATE POLICY utm_links_admin_all ON public.utm_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')));

DROP POLICY IF EXISTS ad_creatives_admin_all ON public.ad_creatives;
CREATE POLICY ad_creatives_admin_all ON public.ad_creatives FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')));

DROP POLICY IF EXISTS affiliate_codes_admin_all ON public.affiliate_codes;
CREATE POLICY affiliate_codes_admin_all ON public.affiliate_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')));

DROP POLICY IF EXISTS brand_voice_admin_all ON public.brand_voice;
CREATE POLICY brand_voice_admin_all ON public.brand_voice FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')));

DROP POLICY IF EXISTS competitor_snapshots_admin_all ON public.competitor_snapshots;
CREATE POLICY competitor_snapshots_admin_all ON public.competitor_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','owner')));

-- utm_links 的 short_code 任何人都能讀 (匿名點短連結時要查 dest_url)
DROP POLICY IF EXISTS utm_links_public_redirect ON public.utm_links;
CREATE POLICY utm_links_public_redirect ON public.utm_links FOR SELECT
  USING (archived_at IS NULL);
