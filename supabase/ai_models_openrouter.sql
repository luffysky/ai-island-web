-- OpenRouter 免費模型（key 在 env OPEN_ROUTER_API_KEY）。
-- ⚠️ 免費模型很常 429 / 下架（如 deepseek-r1 已不再免費）→ 靠 completeForUsage / 聊天路由的
--    智慧備援自動退到其他 active 模型，使用者不用手動調。compiler/model id 失效時更新這檔。
-- 冪等：ON CONFLICT DO UPDATE。
INSERT INTO public.ai_models
  (provider, model_name, display_name, description, context_window, cost_input_per_1m, cost_output_per_1m, tier, is_active, is_default, sort_order)
VALUES
  ('openrouter','openai/gpt-oss-120b:free',                'GPT-OSS 120B（OpenRouter 免費）',   'OpenAI 開源大模型、免費（額度滿自動退備援）', 131072, 0, 0, 'mid',  true, false, 30),
  ('openrouter','qwen/qwen3-next-80b-a3b-instruct:free',   'Qwen3 Next 80B（免費）',            'Alibaba、免費（額度滿自動退備援）',          262144, 0, 0, 'mid',  true, false, 31),
  ('openrouter','google/gemma-4-31b-it:free',              'Gemma 4 31B（免費）',               'Google 開源、免費（額度滿自動退備援）',      131072, 0, 0, 'low',  true, false, 32),
  ('openrouter','nvidia/nemotron-3-ultra-550b-a55b:free',  'Nemotron 3 Ultra 550B（免費）',     'NVIDIA 超大推理、免費（額度滿自動退備援）',  131072, 0, 0, 'high', true, false, 33)
ON CONFLICT (provider, model_name) DO UPDATE SET
  display_name=EXCLUDED.display_name, description=EXCLUDED.description, context_window=EXCLUDED.context_window,
  cost_input_per_1m=0, cost_output_per_1m=0, tier=EXCLUDED.tier, is_active=true, sort_order=EXCLUDED.sort_order, updated_at=NOW();
