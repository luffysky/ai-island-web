-- 免費供應商的可選模型（2026-07-10 查證各家官網當前 model id）。
-- 一律 is_active=false（先當「選項」出現在後台；你貼好該家 key + 測試通過後再勾啟用）。
-- ⚠️ 模型名稱各家改版很快；若某個測試/使用回錯，用後台「＋新增模型」修正、或以該家 /v1/models 實際 id 為準。

-- 免費每日上限：consume_ai_quota 讀「預設模型」的 free_tier_daily_limit → 調到 100。
UPDATE public.ai_models SET free_tier_daily_limit = 100 WHERE is_default = TRUE;

-- 插入函式：同 (provider, model_name) 已存在就跳過。
DO $$
DECLARE
  rows_data jsonb := '[
    {"provider":"cerebras","model_name":"gpt-oss-120b","display_name":"GPT-OSS 120B (Cerebras)","tier":"mid"},
    {"provider":"cerebras","model_name":"zai-glm-4.7","display_name":"GLM 4.7 (Cerebras)","tier":"mid"},
    {"provider":"cerebras","model_name":"llama-3.3-70b","display_name":"Llama 3.3 70B (Cerebras)","tier":"mid"},

    {"provider":"groq","model_name":"openai/gpt-oss-20b","display_name":"GPT-OSS 20B (Groq)","tier":"low"},
    {"provider":"groq","model_name":"openai/gpt-oss-120b","display_name":"GPT-OSS 120B (Groq)","tier":"mid"},
    {"provider":"groq","model_name":"qwen/qwen3-32b","display_name":"Qwen3 32B (Groq)","tier":"mid"},
    {"provider":"groq","model_name":"moonshotai/kimi-k2-instruct-0905","display_name":"Kimi K2 (Groq)","tier":"mid"},

    {"provider":"google","model_name":"gemini-2.5-flash-lite","display_name":"Gemini 2.5 Flash-Lite","tier":"low"},
    {"provider":"google","model_name":"gemini-2.5-flash","display_name":"Gemini 2.5 Flash","tier":"low"},
    {"provider":"google","model_name":"gemini-2.5-pro","display_name":"Gemini 2.5 Pro","tier":"high"},

    {"provider":"nvidia","model_name":"meta/llama-3.1-70b-instruct","display_name":"Llama 3.1 70B (NVIDIA)","tier":"mid"},
    {"provider":"nvidia","model_name":"nvidia/llama-3.1-nemotron-70b-instruct","display_name":"Nemotron 70B (NVIDIA)","tier":"mid"},
    {"provider":"nvidia","model_name":"qwen/qwen2.5-coder-32b-instruct","display_name":"Qwen2.5 Coder 32B (NVIDIA)","tier":"mid"},

    {"provider":"mistral","model_name":"open-mistral-nemo","display_name":"Mistral Nemo","tier":"low"},
    {"provider":"mistral","model_name":"ministral-8b-latest","display_name":"Ministral 8B","tier":"low"},
    {"provider":"mistral","model_name":"mistral-small-latest","display_name":"Mistral Small","tier":"mid"},

    {"provider":"openrouter","model_name":"meta-llama/llama-3.3-70b-instruct:free","display_name":"Llama 3.3 70B (OR free)","tier":"mid"},
    {"provider":"openrouter","model_name":"qwen/qwen3-coder:free","display_name":"Qwen3 Coder (OR free)","tier":"mid"}
  ]'::jsonb;
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(rows_data) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.ai_models
      WHERE provider = r->>'provider' AND model_name = r->>'model_name'
    ) THEN
      INSERT INTO public.ai_models
        (provider, model_name, display_name, description, tier, is_active, is_default, free_tier_daily_limit, cost_input_per_1m, cost_output_per_1m)
      VALUES
        (r->>'provider', r->>'model_name', r->>'display_name', '免費供應商模型（2026-07 查證）', r->>'tier', FALSE, FALSE, 100, 0, 0);
    END IF;
  END LOOP;
END $$;
