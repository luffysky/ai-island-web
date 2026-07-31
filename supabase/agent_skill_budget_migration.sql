-- 2.7.4 per-agent daily budget：每個員工(技能)可設每日任務上限，防單一員工失控燒錢。0/null = 不限。
alter table public.agent_skills add column if not exists daily_budget int not null default 0;
