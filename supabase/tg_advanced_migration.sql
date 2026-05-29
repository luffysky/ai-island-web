-- TG bot 11 條進階指令 — 表結構
-- 林董：silence / focus / journal / idea / broadcast / grant_premium / vip / risk / digest / tr / rewrite

-- 1) admin TG 偏好（per-chat、in-memory 不夠用、跨 deploy 要持久）
create table if not exists tg_admin_state (
  chat_id bigint primary key,
  silenced_until timestamptz,           -- /silence 30 min / off
  focus_until timestamptz,              -- /focus 25 → 25 分後 push 提醒
  focus_topic text,                     -- 番茄鐘做什麼
  silenced_channels text[],             -- 哪些頻道 push 暫停 ['discord', 'launchpad_auto']
  updated_at timestamptz default now()
);

-- 2) 林董私人日誌（/journal）
create table if not exists owner_journal (
  id uuid primary key default gen_random_uuid(),
  channel text not null,                -- 'telegram' / 'web' / 'line'
  content text not null,
  mood text,                            -- '😊' / '😴' / '🔥' AI 抽
  ai_summary text,                      -- 雪鑰每週濃縮
  created_at timestamptz default now()
);

create index if not exists owner_journal_created_idx on owner_journal (created_at desc);

-- 3) 靈感箱（/idea）
create table if not exists owner_ideas (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  content text not null,
  tags text[],                          -- AI 自動標 [feature, bug, marketing]
  priority text default 'p2',           -- AI 評估 p0/p1/p2/p3
  status text default 'inbox',          -- inbox / planned / archived
  ai_reaction text,                     -- 雪鑰一句評
  created_at timestamptz default now()
);

create index if not exists owner_ideas_created_idx on owner_ideas (created_at desc);
create index if not exists owner_ideas_status_idx on owner_ideas (status);

-- 4) Broadcast log（避免重複推、稽核）
create table if not exists broadcast_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null,                -- 'line' / 'tg' / 'discord' / 'email'
  audience text not null,               -- 'all' / 'premium' / 'admin' / segment_name
  content text not null,
  sender_id uuid references profiles(id),
  sent_count int default 0,
  failed_count int default 0,
  meta jsonb,
  created_at timestamptz default now()
);

create index if not exists broadcast_log_created_idx on broadcast_log (created_at desc);

-- RLS：owner only
alter table tg_admin_state enable row level security;
alter table owner_journal enable row level security;
alter table owner_ideas enable row level security;
alter table broadcast_log enable row level security;

-- 服務端用 service_role bypass、不開 user policy（這幾張只允許 admin SDK）

-- 5) /focus 番茄鐘提醒 — 用 cron 每分鐘掃 focus_until 已到、push 到 chat
-- 這要 vercel/zeabur cron 設定、不在這個 sql 內
