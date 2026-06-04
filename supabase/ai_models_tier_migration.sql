-- AI 路由：模型分級欄位（route-suggest / AI Router 用、之前漏建）
alter table public.ai_models add column if not exists tier text;
