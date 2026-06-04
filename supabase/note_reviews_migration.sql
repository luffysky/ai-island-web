-- 筆記間隔複習（SRS）：每位使用者對每則筆記各自的複習排程。冪等
create table if not exists public.note_reviews (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  due_at timestamptz not null default now(),
  interval_days int not null default 1,
  ease real not null default 2.5,
  reviews int not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz default now(),
  primary key (note_id, user_id)
);
alter table public.note_reviews enable row level security;
drop policy if exists nr_own on public.note_reviews;
create policy nr_own on public.note_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists note_reviews_due_idx on public.note_reviews(user_id, due_at);
