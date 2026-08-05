-- 背景系統（Phase 4）：使用者可選一個背景（procedural 動態粒子 / gradient / lottie / image）。
-- 照主題的作法——存目前選擇於 profiles.active_background（jsonb），前台用 cookie ai_bg 做首屏，
-- 不另開 background_items 表（v1 只需「選一個套用」，未來要收藏庫再加表）。
-- 另建 backgrounds storage bucket 供 Phase 4b 自訂圖片上傳。
-- 全冪等、重跑安全、不刪任何東西。

-- 目前套用的背景規格：
--   { type: 'procedural'|'gradient'|'lottie'|'image',
--     proceduralId?, gradientCss?, lottieSrc?, imageUrl?,
--     overlayColor?, overlayOpacity?, density?, blur?, tone? }
alter table public.profiles
  add column if not exists active_background jsonb;

comment on column public.profiles.active_background is
  '使用者目前套用的背景規格（type + 對應來源 + overlay/density/tone）。null=無背景。';

-- 自訂背景圖 bucket（Phase 4b 上傳用；公開讀，非敏感）。
insert into storage.buckets (id, name, public)
  values ('backgrounds', 'backgrounds', true)
  on conflict (id) do nothing;

drop policy if exists "backgrounds bucket public read" on storage.objects;
create policy "backgrounds bucket public read" on storage.objects
  for select using (bucket_id = 'backgrounds');

-- 自己的資料夾可上傳/覆寫/刪（path 前綴 = auth.uid()）
drop policy if exists "backgrounds owner write" on storage.objects;
create policy "backgrounds owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "backgrounds owner update" on storage.objects;
create policy "backgrounds owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "backgrounds owner delete" on storage.objects;
create policy "backgrounds owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
