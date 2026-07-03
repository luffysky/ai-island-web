-- SRS（間隔重複）錯題複習佇列
-- 用途：miniQuiz / 隨堂考答錯的題目排入 Anki 式複習排程
-- 純新增（additive）：只 CREATE IF NOT EXISTS、不動既有表
create extension if not exists pgcrypto;

create table if not exists public.srs_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_ref    text not null,                 -- chapter_id + lesson_id，例如 "26:26.3"
  question_hash text not null,                 -- 題目內容雜湊（去重用）
  question      jsonb not null,                -- 完整 miniQuiz item（question/options/answer/explanation）
  interval_days int  not null default 1,       -- 目前間隔天數
  ease          real not null default 2.5,     -- 難易係數（答對變大、答錯縮回）
  due_at        timestamptz not null default now() + interval '1 day',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, lesson_ref, question_hash)
);

create index if not exists srs_reviews_user_due_idx
  on public.srs_reviews (user_id, due_at);

-- RLS：只能看/改自己的
alter table public.srs_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'srs_reviews' and policyname = 'srs_reviews_self_select'
  ) then
    create policy srs_reviews_self_select on public.srs_reviews
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'srs_reviews' and policyname = 'srs_reviews_self_insert'
  ) then
    create policy srs_reviews_self_insert on public.srs_reviews
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'srs_reviews' and policyname = 'srs_reviews_self_update'
  ) then
    create policy srs_reviews_self_update on public.srs_reviews
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'srs_reviews' and policyname = 'srs_reviews_self_delete'
  ) then
    create policy srs_reviews_self_delete on public.srs_reviews
      for delete using (auth.uid() = user_id);
  end if;
end $$;
