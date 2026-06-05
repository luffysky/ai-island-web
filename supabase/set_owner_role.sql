-- 設定角色：Luffy Lin → owner（最高權限）、luffysky004（小號、測學員視角）→ member
-- ⚠️ 'owner' 原本不在 profiles_role_check 允許值內（系統舊版用 is_owner 旗標代表 owner），
--    但程式碼到處都判斷 role==='owner'，所以這裡把 owner 補進 constraint，讓它成為正式角色。
-- 本檔已於 2026-06-06 套用到正式機。

-- 1) 允許 owner 角色
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['member','editor','admin','teacher','assistant','owner']));

-- 2) 設角色（先 SELECT 確認是哪列再跑；這裡用 display_name，必要時改 id/username）
-- select id, username, display_name, role from profiles
--   where display_name='Luffy Lin' or username in ('luffysky00','luffysky004');

UPDATE public.profiles SET role = 'owner',  is_owner = true  WHERE display_name = 'Luffy Lin';
UPDATE public.profiles SET role = 'member', is_owner = false WHERE username = 'luffysky004';

-- 注意：程式端「owner ⊇ admin」邏輯已補齊並部署，owner 不會被舊版只認 'admin' 的頁面擋住。
