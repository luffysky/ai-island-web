-- Creator Island — 後台可指定每個 agent 用哪個模型（空 = 自動）。冪等。
INSERT INTO public.app_settings (key, value, description, category, value_type)
VALUES (
  'creator_island_agent_models',
  '{}'::jsonb,
  'Creator Island 各 AI agent 指定模型（model_name；空字串=自動挑最佳可用）',
  'ai',
  'json'
)
ON CONFLICT (key) DO NOTHING;
