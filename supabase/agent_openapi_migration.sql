-- 2.1.6 工具自動發現（OpenAPI → tools）：使用者註冊的 OpenAPI 來源，載入時轉成 Agent 動態工具。
create table if not exists public.agent_openapi_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                 -- 顯示名 + 工具命名空間
  spec_url text not null,             -- OpenAPI JSON 網址
  base_url text,                      -- 選填：覆蓋 spec.servers[0].url
  auth_header text,                   -- 選填：Authorization 值
  enabled bool not null default true,
  created_at timestamptz not null default now()
);
alter table public.agent_openapi_sources enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='agent_openapi_sources' and policyname='own_openapi') then
    create policy own_openapi on public.agent_openapi_sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
