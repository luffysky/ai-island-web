-- 客服工單缺欄位：內文 + 聯絡 email（API 與後台都用到、之前漏建）
-- 冪等、重跑安全
alter table public.tickets add column if not exists body text;
alter table public.tickets add column if not exists email text;
