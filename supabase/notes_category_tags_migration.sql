-- 筆記分類 + 標籤
alter table public.notes add column if not exists category text;
alter table public.notes add column if not exists tags text[] default '{}';
create index if not exists notes_user_category_idx on public.notes (user_id, category);
