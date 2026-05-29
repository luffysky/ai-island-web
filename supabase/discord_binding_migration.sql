-- Discord OAuth 綁定 + 學員 Discord 流（DC#4/5/7/1 基礎）
-- 林董：學員 Discord 流先做 OAuth bind、之後付費 / role / 圖片 / slash command 都要這個對應

create table if not exists user_discord_bind (
  user_id uuid primary key references profiles(id) on delete cascade,
  discord_user_id text not null,
  discord_username text,
  discord_avatar text,
  oauth_token_encrypted text,           -- 加密存 refresh token、給之後 patch role 用
  guild_member_added boolean default false, -- 是否已在 guild 內
  bound_at timestamptz default now(),
  last_role_sync_at timestamptz,
  meta jsonb default '{}'::jsonb
);

create unique index if not exists user_discord_bind_discord_idx on user_discord_bind (discord_user_id);
create index if not exists user_discord_bind_bound_at_idx on user_discord_bind (bound_at desc);

-- onboarding state（DC#5 新人 DM 進度）
create table if not exists user_discord_onboarding (
  user_id uuid primary key references profiles(id) on delete cascade,
  dm_welcome_sent_at timestamptz,
  dm_tutorial_sent_at timestamptz,
  dm_first_chapter_sent_at timestamptz,
  completed_at timestamptz
);

-- RLS：service_role 寫、user 讀自己
alter table user_discord_bind enable row level security;
alter table user_discord_onboarding enable row level security;

drop policy if exists "user reads own discord bind" on user_discord_bind;
create policy "user reads own discord bind"
  on user_discord_bind for select
  using (auth.uid() = user_id);

drop policy if exists "user reads own onboarding" on user_discord_onboarding;
create policy "user reads own onboarding"
  on user_discord_onboarding for select
  using (auth.uid() = user_id);
