-- 筆記釘選（置頂）。冪等、重跑安全
alter table public.notes add column if not exists pinned boolean default false;
create index if not exists notes_user_pinned_idx on public.notes(user_id, pinned) where pinned = true;
