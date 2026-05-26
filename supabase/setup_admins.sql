-- ============================================
-- AI 島 管理員帳號設定
-- ============================================
-- 步驟：
-- 1. 在前台 /signup 註冊兩個帳號（用真實 email）
--    例如：luffysky@ai-island-web.snowrealm.pet 跟 nami@ai-island-web.snowrealm.pet
-- 2. 註冊完後、來 SQL Editor 執行這份 SQL
--    把 email 換成你註冊用的
-- ============================================

-- 把 luffysky 設為 admin（換成你註冊用的 email）
UPDATE public.profiles
SET role = 'admin',
    display_name = COALESCE(display_name, 'Luffysky')
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'luffysky@ai-island-web.snowrealm.pet'
);

-- 把 Nami 設為 admin
UPDATE public.profiles
SET role = 'admin',
    display_name = COALESCE(display_name, 'Nami')
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'nami@ai-island-web.snowrealm.pet'
);

-- 驗證
SELECT u.email, p.username, p.display_name, p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.role = 'admin';

-- 之後管理員可以在 /admin/users 互相 promote / demote 其他用戶
