-- Code Quest 「AI 生成關卡」：後台生成 → 審核 → 存這張表，遊戲載入時併進內建關卡（衝 50 關）。
-- 讀寫都走 service-role（後台生成 + 遊戲 server 載入）；RLS 開但不給 public policy＝一般使用者不直接查。
create table if not exists public.quest_ai_levels (
  id          uuid primary key default gen_random_uuid(),
  level_id    text not null unique,              -- 例：num-ai-xxxx；跟內建關卡共用 quest_completions
  game_type   text not null default 'number',    -- 目前支援 number（純 stdout 比對，最好驗）
  title       text not null,
  concept     text not null default '',
  chapter_id  int,                                -- 對應章節（可空）
  intro       text not null default '',
  hint        text not null default '',
  expect      text not null default '',           -- 預期 stdout
  starter     text not null default '',
  par_lines   int not null default 5,
  xp          int not null default 15,
  z           int not null default 8,
  approved    boolean not null default true,      -- 後台存檔＝已審核；下架設 false
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_quest_ai_levels_type on public.quest_ai_levels(game_type, approved, created_at);
alter table public.quest_ai_levels enable row level security;
