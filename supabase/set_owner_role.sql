-- 設定角色：Luffy Lin → owner（最高權限）、luffysky004（小號、測學員視角）→ member
-- ⚠️ 先跑這段「看清楚要改誰」再跑 UPDATE：
select id, username, display_name, role
from profiles
where display_name = 'Luffy Lin'
   or username in ('luffysky00', 'luffysky004');

-- 確認上面 Luffy Lin 是哪一列後，二選一執行（建議用 username 或 id，最精準）：
-- update profiles set role = 'owner'  where username = '林董的_username';   -- 把它換成上面查到的
update profiles set role = 'owner'  where display_name = 'Luffy Lin';
update profiles set role = 'member' where username = 'luffysky004';

-- 注意：程式端「owner ⊇ admin」的邏輯已補齊並部署後再跑這段，
-- 否則改成 owner 的瞬間、舊版某些只認 'admin' 的頁面會把 owner 擋在外面。
