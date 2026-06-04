-- 筆記可選標題（nullable）。冪等、重跑安全
alter table public.notes add column if not exists title text;
