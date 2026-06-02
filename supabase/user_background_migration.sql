-- 個人背景：學員可選預設背景或上傳圖片當背景
alter table public.profiles add column if not exists background text;
comment on column public.profiles.background is '個人背景：預設 key（gradient-xxx）或上傳圖片 URL；null = 預設';
