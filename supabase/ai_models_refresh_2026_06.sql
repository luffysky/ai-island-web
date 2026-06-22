-- AI 模型清單更新（2026-06）
-- 起因：Google Gemini 2.0 Flash 已於 2026 下架（API 回 404）、但 DB 還列著讓使用者選 → 報錯。
--      同時擴充各家可選模型、讓 admin 在 /admin/ai/models 用 on/off 自由啟用。
-- 成本欄位僅供顯示/預算估算、非實際計費、為近似值。
-- 冪等：UNIQUE(provider, model_name)。重跑安全。
--
-- 規則：
--   A) 主力模型 → ON CONFLICT DO UPDATE（強制 is_active=true、更新顯示資訊）。
--   B) 進階/新/實驗模型 → ON CONFLICT DO NOTHING + is_active=false（admin 自己開、重跑不覆蓋其選擇）。

-- 0) 下架失效模型（保留 row 供歷史、設 inactive、選單不再出現）
UPDATE public.ai_models SET is_active = false, updated_at = NOW()
 WHERE provider = 'google' AND model_name = 'gemini-2.0-flash';

-- A) 主力模型（預設啟用）
INSERT INTO public.ai_models
  (provider, model_name, display_name, description, context_window, cost_input_per_1m, cost_output_per_1m, tier, is_active, is_default, sort_order)
VALUES
  ('anthropic', 'claude-haiku-4-5-20251001', 'Claude Haiku 4.5', '最快、最便宜、適合一般問題', 200000, 1.00, 5.00,  'mid',  true, true,  1),
  ('anthropic', 'claude-sonnet-4-6',         'Claude Sonnet 4.6', '平衡速度跟智慧、推薦',         200000, 3.00, 15.00, 'high', true, false, 2),
  ('anthropic', 'claude-opus-4-8',           'Claude Opus 4.8',   '最強推理、難題/長文首選',       200000, 5.00, 25.00, 'high', true, false, 3),
  ('openai',    'gpt-4o-mini',  'GPT-4o mini', 'OpenAI 平價選擇',          128000, 0.15, 0.60,  'low',  true, false, 4),
  ('openai',    'gpt-4o',       'GPT-4o',      '通用、品質好',              128000, 2.50, 10.00, 'high', true, false, 5),
  ('openai',    'gpt-4.1-mini', 'GPT-4.1 mini','4.1 平價、比 4o-mini 更新', 1000000, 0.40, 1.60, 'low',  true, false, 6),
  ('openai',    'gpt-4.1',      'GPT-4.1',     '長 context（1M）、強通用',   1000000, 2.00, 8.00, 'high', true, false, 7),
  ('google',    'gemini-2.5-flash', 'Gemini 2.5 Flash', '快、便宜、Google 生態',  1000000, 0.30, 2.50,  'low',  true, false, 8),
  ('google',    'gemini-2.5-pro',   'Gemini 2.5 Pro',   '長 context、深度分析',    2000000, 1.25, 10.00, 'high', true, false, 9),
  ('google',    'gemini-3.5-flash', 'Gemini 3.5 Flash', 'Google 最新快速模型',     1000000, 0.30, 2.50,  'mid',  true, false, 10),
  ('groq',      'llama-3.3-70b-versatile', 'Llama 3.3 70B', 'Meta 開源、超快（Groq）',     131072, 0.59, 0.79, 'mid', true, false, 11),
  ('groq',      'llama-3.1-8b-instant',    'Llama 3.1 8B',  'Meta 開源、極快極省（Groq）', 131072, 0.05, 0.08, 'low', true, false, 12),
  ('groq',      'openai/gpt-oss-120b',     'GPT-OSS 120B',  'OpenAI 開源大模型（Groq）',   131072, 0.15, 0.75, 'mid', true, false, 13)
ON CONFLICT (provider, model_name) DO UPDATE SET
  display_name=EXCLUDED.display_name, description=EXCLUDED.description, context_window=EXCLUDED.context_window,
  cost_input_per_1m=EXCLUDED.cost_input_per_1m, cost_output_per_1m=EXCLUDED.cost_output_per_1m,
  tier=EXCLUDED.tier, is_active=true, sort_order=EXCLUDED.sort_order, updated_at=NOW();

-- B) 進階 / 最新 / 實驗模型（預設關閉、admin 想用再 on）
INSERT INTO public.ai_models
  (provider, model_name, display_name, description, context_window, cost_input_per_1m, cost_output_per_1m, tier, is_active, is_default, sort_order)
VALUES
  ('anthropic', 'claude-fable-5', 'Claude Fable 5', '創意/敘事特化（進階、預設關）',       200000, 3.00, 15.00, 'high', false, false, 20),
  ('openai',    'gpt-4.1-nano',   'GPT-4.1 nano',   '最省、適合分類/抽取（進階、預設關）',  1000000, 0.10, 0.40, 'low',  false, false, 21),
  ('openai',    'gpt-5.5',        'GPT-5.5',        'OpenAI 旗艦推理（進階、預設關、成本高）', 400000, 6.00, 24.00, 'high', false, false, 22),
  ('openai',    'gpt-5.4-mini',   'GPT-5.4 mini',   'GPT-5 系列平價（進階、預設關）',       400000, 0.50, 2.00, 'mid',  false, false, 23),
  ('google',    'gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', '更省的 2.5（進階、預設關）',  1000000, 0.10, 0.40, 'low', false, false, 24),
  ('google',    'gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite', 'Gemini 3 系列輕量（進階、預設關）', 1000000, 0.15, 0.60, 'low', false, false, 25),
  ('groq',      'openai/gpt-oss-20b', 'GPT-OSS 20B', 'OpenAI 開源小模型（進階、預設關）',   131072, 0.10, 0.50, 'low', false, false, 26),
  ('groq',      'qwen/qwen3-32b',     'Qwen3 32B',   'Alibaba 開源（進階、預設關）',         131072, 0.29, 0.59, 'mid', false, false, 27)
ON CONFLICT (provider, model_name) DO NOTHING;
