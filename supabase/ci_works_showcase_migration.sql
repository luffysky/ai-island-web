-- 創作者公開展示：作品可從作品庫「發佈到公開展示頁」。
alter table public.ci_works
  add column if not exists is_showcased boolean not null default false,
  add column if not exists showcased_at timestamptz;
create index if not exists idx_ci_works_showcase on public.ci_works(is_showcased, showcased_at desc) where is_showcased;
