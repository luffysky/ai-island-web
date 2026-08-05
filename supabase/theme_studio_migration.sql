-- Theme Studio（Phase 2）：使用者自訂主題表 + profiles.active_theme_id 指標
-- 單使用者版（照 Space 但 space_id → user_id）。全冪等、重跑安全。
-- 套用主題＝改 profiles.active_theme_id（見 POST /api/themes/[id]/apply）。

create extension if not exists pgcrypto;

-- 自訂主題：definition 存整包 ThemeDefinition（見 src/lib/theme/engine/types.ts）
create table if not exists public.themes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  definition   jsonb not null,
  source       text not null default 'manual',   -- manual|from_image|from_mood|imported|preset
  a11y_report  jsonb,                             -- 快取 analyzeTheme() 結果
  is_favorite  boolean not null default false,
  is_preset    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz                        -- soft delete
);

create index if not exists idx_themes_user_updated
  on public.themes(user_id, updated_at desc)
  where deleted_at is null;

alter table public.themes enable row level security;

-- RLS：本人 CRUD 自己的主題（service-role admin client 會 bypass）
drop policy if exists themes_owner_all on public.themes;
create policy themes_owner_all on public.themes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- profiles 加「目前套用的主題」指標；主題被刪→指標歸 null（回預設主題）
alter table public.profiles
  add column if not exists active_theme_id uuid references public.themes(id) on delete set null;
