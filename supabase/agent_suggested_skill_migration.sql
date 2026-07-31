-- 2.1.3 執行中自動建 skill：任務成功後自動蒸餾的技能建議草稿（前端一鍵採用）。
alter table public.agent_tasks add column if not exists suggested_skill jsonb;
