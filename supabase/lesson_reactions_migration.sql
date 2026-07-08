-- 2026-07-09 — 學習反應（懂了 / 卡住 / 太神 / 哈哈 / 加油 / 讚 / 愛 / 慶祝）。
-- 每節課的情緒反饋條；未登入也能按（用瀏覽器 fingerprint 去重，跟 blog_reactions 同套路）。
-- 讀寫都走 service-role API（admin bypass RLS）；啟用 RLS 擋掉匿名直連。
create table if not exists public.lesson_reactions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  chapter_id integer,
  fingerprint text not null,
  reaction_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists lesson_reactions_lesson_idx on public.lesson_reactions(lesson_id);
-- 同一個人（fingerprint）對同一節同一個 reaction 只算一次
create unique index if not exists lesson_reactions_uniq on public.lesson_reactions(lesson_id, fingerprint, reaction_key);
alter table public.lesson_reactions enable row level security;
