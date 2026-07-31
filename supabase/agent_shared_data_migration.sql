-- 2.6.5 Agent 互相共享資料（寫 DB 不經 LLM）：使用者範圍的結構化黑板，agent 可用 data.write/read/list 直接交換 jsonb，
-- 資料本身不經 LLM 重述（省 token、不失真）。
create table if not exists public.agent_shared_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_by_task uuid,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.agent_shared_data enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='agent_shared_data' and policyname='own_shared_data') then
    create policy own_shared_data on public.agent_shared_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
