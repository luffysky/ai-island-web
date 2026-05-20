-- ============================================
-- AI 學習導師 / 模型管理 / SEO / Analytics
-- ============================================
-- 在 Supabase SQL Editor 執行
-- ============================================

-- =========== AI 模型設定 ===========
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,                  -- 'openai' | 'anthropic' | 'google' | 'meta' | 'groq' | 'custom'
  model_name TEXT NOT NULL,                -- 'gpt-4o-mini' / 'claude-3-5-haiku' / 'gemini-2.0-flash' / 'llama-3.3-70b'
  display_name TEXT NOT NULL,              -- 給 user 看的名稱
  description TEXT,
  context_window INT,                      -- e.g. 200000
  cost_input_per_1m DECIMAL(10, 4),        -- USD per 1M input tokens
  cost_output_per_1m DECIMAL(10, 4),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  free_tier_daily_limit INT DEFAULT 10,    -- 免費用戶每天可用次數
  premium_tier_daily_limit INT DEFAULT 100,
  sort_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model_name)
);

-- 預設模型
INSERT INTO public.ai_models (provider, model_name, display_name, description, context_window, cost_input_per_1m, cost_output_per_1m, is_default, sort_order) VALUES
  ('anthropic', 'claude-haiku-4-5-20251001', 'Claude Haiku 4.5', '最快、最便宜、適合一般問題', 200000, 1.00, 5.00, true, 1),
  ('anthropic', 'claude-sonnet-4-6', 'Claude Sonnet 4.6', '平衡速度跟智慧、推薦', 200000, 3.00, 15.00, false, 2),
  ('openai', 'gpt-4o-mini', 'GPT-4o mini', 'OpenAI 平價選擇', 128000, 0.15, 0.60, false, 3),
  ('openai', 'gpt-4o', 'GPT-4o', '通用、品質好', 128000, 2.50, 10.00, false, 4),
  ('google', 'gemini-2.0-flash', 'Gemini 2.0 Flash', '快、便宜、Google 生態', 1000000, 0.075, 0.30, false, 5),
  ('google', 'gemini-2.5-pro', 'Gemini 2.5 Pro', '長 context（1M）、深度分析', 2000000, 1.25, 5.00, false, 6),
  ('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', 'Meta 開源、超快（Groq）', 128000, 0.59, 0.79, false, 7)
ON CONFLICT (provider, model_name) DO NOTHING;


-- =========== API Keys（系統密鑰）===========
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,           -- 'openai' / 'anthropic' / etc
  api_key_encrypted TEXT NOT NULL,         -- 用 Supabase Vault 或 app-level 加密
  monthly_budget_usd DECIMAL(10, 2) DEFAULT 50.00,
  used_this_month_usd DECIMAL(10, 4) DEFAULT 0,
  reset_at DATE,                           -- 下次重置
  enabled BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);


-- =========== AI 對話紀錄 ===========
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,                              -- 自動產生 / user 改
  model_id UUID REFERENCES public.ai_models(id),
  tone TEXT DEFAULT 'friendly',            -- 'friendly' | 'concise' | 'detailed' | 'tutor' | 'casual_tw'
  context_lesson_id TEXT,                  -- 在哪 lesson 啟動的（可選）
  context_chapter_id INT,
  use_byok BOOLEAN DEFAULT FALSE,          -- 用 user 自己 key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON public.ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                      -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(10, 6),
  latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON public.ai_messages(conversation_id, created_at);


-- =========== Token 使用量（每日彙總、加速 dashboard 查詢）===========
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  date DATE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ai_models(id),
  provider TEXT NOT NULL,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  message_count INT DEFAULT 0,
  PRIMARY KEY (date, user_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON public.ai_usage_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON public.ai_usage_daily(provider, date DESC);


-- =========== BYOK：user 自帶 API Key ===========
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_keys_own" ON public.user_api_keys
  FOR ALL USING (auth.uid() = user_id);


-- =========== 每日免費額度追蹤 ===========
CREATE TABLE IF NOT EXISTS public.ai_daily_quota (
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  free_used INT DEFAULT 0,
  premium_used INT DEFAULT 0,
  PRIMARY KEY (date, user_id)
);


-- =========== SEO / GEO 管理 ===========
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT UNIQUE NOT NULL,               -- '/chapters/1' '/'
  title TEXT,
  description TEXT,
  keywords TEXT[],
  og_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index,follow',      -- 'noindex,nofollow' for private
  schema_jsonld JSONB,                     -- 結構化資料
  custom_head_html TEXT,                   -- 額外 meta / script
  priority DECIMAL(2, 1) DEFAULT 0.5,      -- sitemap priority
  changefreq TEXT DEFAULT 'weekly',
  -- GEO targeting
  geo_target TEXT,                         -- 'TW' / 'JP' / 'global'
  hreflang JSONB,                          -- { "en": "https://...", "ja": "..." }
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_seo_path ON public.seo_pages(path);

CREATE TABLE IF NOT EXISTS public.seo_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT UNIQUE NOT NULL,
  to_path TEXT NOT NULL,
  status_code INT DEFAULT 301,
  enabled BOOLEAN DEFAULT TRUE,
  hits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========== GA4 / Analytics 快取（讓 dashboard 不用每次 call GA API）===========
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  date DATE PRIMARY KEY,
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  avg_engagement_sec INT DEFAULT 0,
  bounce_rate DECIMAL(5, 2) DEFAULT 0,
  top_pages JSONB DEFAULT '[]'::jsonb,     -- [{path, views}]
  top_referrers JSONB DEFAULT '[]'::jsonb,
  top_countries JSONB DEFAULT '[]'::jsonb,
  top_devices JSONB DEFAULT '[]'::jsonb,
  conversions JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'ga4',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========== RLS ===========
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_daily_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conv_own" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ai_msg_own" ON public.ai_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "ai_quota_own" ON public.ai_daily_quota
  FOR ALL USING (auth.uid() = user_id);


-- =========== Function：扣每日 quota ===========
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_user_id UUID,
  p_amount INT DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_used INT;
  v_role TEXT;
  v_limit INT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  SELECT
    CASE WHEN v_role = 'admin' OR v_role = 'editor' THEN 999999
         ELSE COALESCE(free_tier_daily_limit, 10)
    END
  INTO v_limit
  FROM public.ai_models
  WHERE is_default = TRUE
  LIMIT 1;

  v_limit := COALESCE(v_limit, 10);

  INSERT INTO public.ai_daily_quota(date, user_id, free_used)
  VALUES (CURRENT_DATE, p_user_id, 0)
  ON CONFLICT (date, user_id) DO NOTHING;

  SELECT free_used INTO v_used
  FROM public.ai_daily_quota
  WHERE date = CURRENT_DATE AND user_id = p_user_id;

  IF v_used + p_amount > v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.ai_daily_quota
  SET free_used = free_used + p_amount
  WHERE date = CURRENT_DATE AND user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========== Function：累加 daily 使用量 ===========
CREATE OR REPLACE FUNCTION public.upsert_ai_usage(
  p_date DATE,
  p_user_id UUID,
  p_model_id UUID,
  p_provider TEXT,
  p_tokens_in INT,
  p_tokens_out INT,
  p_cost DECIMAL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.ai_usage_daily(date, user_id, model_id, provider, tokens_input, tokens_output, cost_usd, message_count)
  VALUES (p_date, p_user_id, p_model_id, p_provider, p_tokens_in, p_tokens_out, p_cost, 1)
  ON CONFLICT (date, user_id, model_id) DO UPDATE
  SET tokens_input = ai_usage_daily.tokens_input + EXCLUDED.tokens_input,
      tokens_output = ai_usage_daily.tokens_output + EXCLUDED.tokens_output,
      cost_usd = ai_usage_daily.cost_usd + EXCLUDED.cost_usd,
      message_count = ai_usage_daily.message_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========== Function：累加系統 key 月用量 ===========
CREATE OR REPLACE FUNCTION public.inc_system_key_usage(
  p_provider TEXT,
  p_cost DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_api_keys
  SET used_this_month_usd = used_this_month_usd + p_cost,
      updated_at = NOW()
  WHERE provider = p_provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
