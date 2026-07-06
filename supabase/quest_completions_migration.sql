-- Code Quest 通關紀錄（玩遊戲學寫程式）：每人每關一列，記最佳星數；首次通關才發獎。
create table if not exists public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id text not null,
  stars int not null default 1 check (stars between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, level_id)
);
create index if not exists idx_quest_completions_user on public.quest_completions(user_id);
alter table public.quest_completions enable row level security;
drop policy if exists quest_completions_own on public.quest_completions;
create policy quest_completions_own on public.quest_completions for select using (user_id = auth.uid());
