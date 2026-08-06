-- 2026-08-07 §5.7 P1：可編輯 widget 首頁（/home）——per-user 版面 + 實例（照 Space 0011 改租戶 space→user）。冪等。
-- 版面（一個 user 可有多個命名儀表板）
create table if not exists public.widget_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '我的首頁',
  breakpoint_config jsonb not null default '{}'::jsonb,   -- 格線設定（desktop/tablet/mobile 欄數等）
  is_active boolean not null default false,                -- 取代 Space spaces.active_layout_id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- 一個 user 只能有一個 active（partial unique）
create unique index if not exists uq_widget_layouts_active
  on public.widget_layouts(user_id) where is_active and deleted_at is null;

-- 已放置的 widget（一列一個）
create table if not exists public.widget_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layout_id uuid not null references public.widget_layouts(id) on delete cascade,
  widget_type text not null,                  -- 對應 TS WIDGET_REGISTRY 的 id（註冊表以 TS 為準、不做 DB FK）
  position jsonb not null default '{}'::jsonb, -- { desktop:{x,y,w,h}, tablet:{x,y,w,h}, mobile:{order} }
  config jsonb not null default '{}'::jsonb,   -- 該 widget 的 zod config + 自由鍵（bg/bgAnimate/bgOpacity…）
  hidden boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_widget_instances_layout on public.widget_instances(layout_id);

-- RLS：自己的才能讀寫
alter table public.widget_layouts enable row level security;
alter table public.widget_instances enable row level security;
drop policy if exists widget_layouts_owner on public.widget_layouts;
create policy widget_layouts_owner on public.widget_layouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists widget_instances_owner on public.widget_instances;
create policy widget_instances_owner on public.widget_instances for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
