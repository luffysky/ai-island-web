-- Agent 平台 Phase 1b — 桌面助手 Bridge 佇列 + 裝置 token。
-- 架構：AI 島(Zeabur) 不架長駐 WS，改用「device_calls 佇列 + 輪詢」——orchestrator 把需本機的工具丟進佇列、
--        本機 Bridge 輪詢領取→執行→回填結果。對齊 docs/agent_platform_plan.md §1/§5（WS 之後再當優化）。

-- 裝置 token（配對時發一次、只存 hash）。沿用 Phase 1a 的 agent_device_bridges，補欄位。
alter table public.agent_device_bridges add column if not exists token_hash text;
alter table public.agent_device_bridges add column if not exists whitelist jsonb not null default '{}'::jsonb;
alter table public.agent_device_bridges add column if not exists revoked bool not null default false;

-- 本機工具呼叫佇列（orchestrator 入列、Bridge 領取執行、回填）
create table if not exists public.agent_device_calls (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  device_id uuid not null references public.agent_device_bridges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_idx int not null,
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  status text not null default 'pending',              -- pending|running|done|error
  ok bool,
  result jsonb,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz
);
create index if not exists idx_devcalls_device_pending on public.agent_device_calls(device_id, status) where status = 'pending';
create index if not exists idx_devcalls_task on public.agent_device_calls(task_id);

alter table public.agent_device_calls enable row level security;
drop policy if exists "devcalls own" on public.agent_device_calls;
create policy "devcalls own" on public.agent_device_calls for select using (auth.uid() = user_id);
