-- 每則筆記可單獨設定背景圖（圖片 URL + 縮放/位移/旋轉）存成 jsonb
-- 冪等、重跑安全
alter table public.notes add column if not exists bg jsonb;
