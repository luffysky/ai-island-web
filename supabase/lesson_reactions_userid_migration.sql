-- 2026-07-22 — lesson_reactions 加 user_id：登入者的學習反饋要能對到「是誰」（後台 Owner 檢視用）。
-- 未登入仍只有 fingerprint（user_id 為 null）。冪等、可重跑。
alter table public.lesson_reactions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists lesson_reactions_user_idx on public.lesson_reactions(user_id);
create index if not exists lesson_reactions_created_idx on public.lesson_reactions(created_at desc);
