-- 每月每模型用量/費用（細到「哪個模型用多少」）。
-- 為什麼：以前只有 web 聊天會記 cost（ai_usage_daily / ai_api_keys.used_this_month_usd），
-- 但 LINE/TG/Discord bot、排程、推薦等走 callAI 的呼叫「完全沒記」→ 後台費用嚴重低估
-- （Claude 後台 $10、管理後台只顯示 $1）。現在 callAI 一律記到這裡 + inc_system_key_usage。
CREATE TABLE IF NOT EXISTS public.ai_model_usage (
  month TEXT NOT NULL,            -- 'YYYY-MM'
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_input BIGINT NOT NULL DEFAULT 0,
  tokens_output BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  calls INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (month, provider, model_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_usage_month ON public.ai_model_usage(month DESC);

-- 原子累加（service role 呼叫）
CREATE OR REPLACE FUNCTION public.inc_model_usage(
  p_month TEXT, p_provider TEXT, p_model TEXT,
  p_tin BIGINT, p_tout BIGINT, p_cost NUMERIC
) RETURNS void AS $$
  INSERT INTO public.ai_model_usage (month, provider, model_name, tokens_input, tokens_output, cost_usd, calls, updated_at)
  VALUES (p_month, p_provider, p_model, p_tin, p_tout, p_cost, 1, NOW())
  ON CONFLICT (month, provider, model_name) DO UPDATE SET
    tokens_input  = ai_model_usage.tokens_input  + EXCLUDED.tokens_input,
    tokens_output = ai_model_usage.tokens_output + EXCLUDED.tokens_output,
    cost_usd      = ai_model_usage.cost_usd      + EXCLUDED.cost_usd,
    calls         = ai_model_usage.calls + 1,
    updated_at    = NOW();
$$ LANGUAGE sql;

-- 只 service role 讀寫（owner 頁用 service role）
ALTER TABLE public.ai_model_usage ENABLE ROW LEVEL SECURITY;
