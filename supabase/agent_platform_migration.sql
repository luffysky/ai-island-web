-- AI 島行動代理系統（Agent 平台）Phase 1 — 核心資料表。
-- 對齊 docs/agent_platform_plan.md §3。工具/技能 MVP 以 code-first registry 為主，這裡先建任務/步驟/確認/裝置四張核心表。

-- 已配對的本機/裝置（Phase 1b 才真的接 Electron Bridge；先建表 + status）
create table if not exists public.agent_device_bridges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null default 'windows',           -- windows|android|macos...
  status text not null default 'offline',              -- online|offline
  capabilities jsonb not null default '[]',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_bridge_user on public.agent_device_bridges(user_id);

-- 一次任務
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.agent_device_bridges(id) on delete set null,
  goal text not null,
  status text not null default 'planning',             -- planning|running|awaiting_approval|succeeded|failed|cancelled
  max_steps int not null default 20,
  step_count int not null default 0,
  result jsonb,
  error text,
  cost_usd numeric default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_agent_tasks_user on public.agent_tasks(user_id, created_at desc);

-- 任務裡的每一步（可回放）
create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  idx int not null,
  thought text,                                        -- LLM 這步的想法
  tool_name text,
  risk text,                                           -- read|write|dangerous
  args jsonb,
  result jsonb,
  ok bool,
  verified bool,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_steps_task on public.agent_steps(task_id, idx);

-- 需人工確認的關卡
create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_idx int not null,
  tool_name text not null,
  risk text not null,
  summary jsonb not null,                              -- {動作,位置,影響,可復原}
  decision text not null default 'pending',            -- pending|approved|denied
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_agent_approvals_task on public.agent_approvals(task_id);
create index if not exists idx_agent_approvals_pending on public.agent_approvals(decision) where decision = 'pending';

-- RLS：只看/動自己的（寫入走 service_role + app 層檢查，同 AI 島慣例）
alter table public.agent_device_bridges enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_steps enable row level security;
alter table public.agent_approvals enable row level security;

drop policy if exists "agent_bridge own" on public.agent_device_bridges;
create policy "agent_bridge own" on public.agent_device_bridges for select using (auth.uid() = user_id);
drop policy if exists "agent_tasks own" on public.agent_tasks;
create policy "agent_tasks own" on public.agent_tasks for select using (auth.uid() = user_id);
drop policy if exists "agent_steps own" on public.agent_steps;
create policy "agent_steps own" on public.agent_steps for select using (
  exists (select 1 from public.agent_tasks t where t.id = task_id and t.user_id = auth.uid())
);
drop policy if exists "agent_approvals own" on public.agent_approvals;
create policy "agent_approvals own" on public.agent_approvals for select using (auth.uid() = user_id);
