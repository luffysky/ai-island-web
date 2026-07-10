-- Agent 平台 Phase 4 骨架 — MCP（Model Context Protocol）伺服器登錄。
-- 使用者可登錄 MCP server（先支援我們自己的 /api/mcp）；Agent 執行時把其工具正規化成 AgentTool、走同一套權限/確認。
create table if not exists public.agent_mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                       -- 顯示名 + 工具命名空間
  url text not null,                        -- JSON-RPC 端點（我們自己的：<origin>/api/mcp）
  auth_header text,                          -- 選填：Authorization 值（Bearer ...）
  enabled bool not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_mcp_user on public.agent_mcp_servers(user_id);
alter table public.agent_mcp_servers enable row level security;
drop policy if exists "mcp own" on public.agent_mcp_servers;
create policy "mcp own" on public.agent_mcp_servers for select using (auth.uid() = user_id);
