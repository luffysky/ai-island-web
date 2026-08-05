-- 字體系統（Phase 5a）：fonts / font_pairs 全域表 + fonts storage bucket。
-- 照 Space（ADR-016 fonts 為全域、非 user-scoped）：任何人可讀 enabled，僅 service_role 可寫。
-- 全冪等、重跑安全。

create extension if not exists pgcrypto;

-- 字體：一個字體家族一筆。檔案存在 storage bucket 'fonts'，路徑記在 file_manifest。
create table if not exists public.fonts (
  id                 uuid primary key default gen_random_uuid(),
  family             text not null,                 -- 顯示名，如「思源黑體」
  slug               text unique not null,          -- noto-sans-tc
  category           text not null default 'sans',  -- sans|serif|display|handwriting|mono
  supported_languages text[] not null default '{}', -- ['latin','zh-Hant']
  weights            int[]  not null default '{400}',
  styles             text[] not null default '{normal}',
  preview_text       text,
  file_manifest      jsonb  not null default '{}'::jsonb, -- { "400": { path, bytes } } → storage 'fonts' 的 object key
  subset_strategy    text not null default 'static',      -- static|unicode_range
  fallback_stack     text not null default 'sans-serif',
  license_name       text,
  license_url        text,
  attribution_required boolean not null default false,
  ascent_override    text,
  descent_override   text,
  enabled            boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_fonts_enabled_sort on public.fonts(enabled, sort_order);

alter table public.fonts enable row level security;
drop policy if exists fonts_public_read on public.fonts;
create policy fonts_public_read on public.fonts for select using (enabled = true);
-- 寫入僅 service_role（admin API 用 admin client bypass RLS；不開 authenticated 寫）

-- 字體配對：一組 heading/body/ui 三角。主題可直接選一組。
create table if not exists public.font_pairs (
  id             uuid primary key default gen_random_uuid(),
  name           text unique not null,
  heading_font_id uuid references public.fonts(id) on delete set null,
  body_font_id    uuid references public.fonts(id) on delete set null,
  ui_font_id      uuid references public.fonts(id) on delete set null,
  mood_tags      text[] not null default '{}',
  sort_order     int not null default 0,
  enabled        boolean not null default true,
  created_at     timestamptz not null default now()
);
alter table public.font_pairs enable row level security;
drop policy if exists font_pairs_public_read on public.font_pairs;
create policy font_pairs_public_read on public.font_pairs for select using (enabled = true);

-- Storage bucket：存字體檔（公開讀，字體 bytes 不敏感；上傳由 admin service_role 做）。
insert into storage.buckets (id, name, public)
  values ('fonts', 'fonts', true)
  on conflict (id) do nothing;

-- 字體檔公開可讀
drop policy if exists "fonts bucket public read" on storage.objects;
create policy "fonts bucket public read" on storage.objects
  for select using (bucket_id = 'fonts');
