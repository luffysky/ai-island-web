-- 內容 i18n 快取：DB 內容(章節/lesson/部落格/論壇)的翻譯，翻一次快取；
-- 存來源中文的 hash，來源改了(hash 不同)才重翻，否則永遠用快取。
create table if not exists public.content_translations (
  id          uuid primary key default gen_random_uuid(),
  source_type text not null,     -- 'lesson' | 'chapter' | 'blog' | 'forum'
  source_id   text not null,     -- 該內容 id（uuid 或數字轉字串）
  field       text not null,     -- 'title' | 'content' | 'summary' | 'subtitle' ...
  locale      text not null,     -- 目標語言（先做 'en'）
  source_hash text not null,     -- 來源中文的 hash → 變了就重翻
  translated  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(source_type, source_id, field, locale)
);
create index if not exists idx_content_tr_lookup on public.content_translations(source_type, source_id, locale);
alter table public.content_translations enable row level security;
-- 只走 service-role（server 端讀寫）；不給 public policy
