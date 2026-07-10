-- 程式辭典（Dictionary）：繁中原生、白話、AI 可解釋的「術語 × 語法 × 工程師黑話」。
-- domain 欄位預留給未來「語言島」的英文/日文辭典共用同一張表（domain='english'|'japanese'）。
create extension if not exists pg_trgm;

create table if not exists public.dictionary_terms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                 -- 網址用（async / technical-debt / git-rebase）
  domain      text not null default 'programming',  -- programming | english | japanese ...（語言島共用）
  term        text not null,                        -- 主詞（英文/原文）
  aliases     text[] not null default '{}',         -- 別名/同義
  zh_name     text,                                 -- 中文名
  category    text not null default 'concept',      -- syntax | concept | slang | tool | error
  langs       text[] not null default '{}',         -- python,javascript,css,sql,general...
  plain       text not null,                        -- 白話解釋
  analogy     text,                                 -- 生活比喻
  example     text,                                 -- 小範例（程式碼或情境）
  related     text[] not null default '{}',         -- 相關詞 slug
  difficulty  int  not null default 1,              -- 1 新手 / 2 一般 / 3 進階
  views       int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_dict_domain     on public.dictionary_terms(domain);
create index if not exists idx_dict_category    on public.dictionary_terms(category);
create index if not exists idx_dict_difficulty  on public.dictionary_terms(difficulty);
create index if not exists idx_dict_langs       on public.dictionary_terms using gin(langs);
-- 模糊搜尋（term / zh_name / plain）
create index if not exists idx_dict_term_trgm   on public.dictionary_terms using gin(term gin_trgm_ops);
create index if not exists idx_dict_zh_trgm     on public.dictionary_terms using gin(zh_name gin_trgm_ops);

alter table public.dictionary_terms enable row level security;

-- 公開讀（辭典是公開內容）；寫入走 service_role（seed / admin），不給 public 寫 policy。
drop policy if exists "dictionary public read" on public.dictionary_terms;
create policy "dictionary public read"
  on public.dictionary_terms
  for select
  using (true);

-- 熱度 +1（詳解頁瀏覽用）
create or replace function public.bump_dictionary_view(p_slug text)
returns void
language sql
security definer
set search_path = 'public'
as $$
  update public.dictionary_terms set views = views + 1 where slug = p_slug;
$$;
