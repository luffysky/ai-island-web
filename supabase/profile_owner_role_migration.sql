-- ========================================================================
-- 加 'owner' role 給董事長 (林董 / Luffy)
-- 區隔：admin (一般管理員) vs owner (平台主、可以做所有事)
-- AI prompt 看到 owner 會用「林董」稱呼、不端官話
-- ========================================================================

-- 1. 改 check constraint 加上 owner
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['member'::text, 'editor'::text, 'admin'::text, 'teacher'::text, 'assistant'::text, 'owner'::text]));

-- 2. 把 luffysky00 升級成 owner (使用 username pattern 識別、不依賴 email)
UPDATE public.profiles
SET role = 'owner', updated_at = NOW()
WHERE username ILIKE 'luffysky00%' OR username = 'luffysky00';

-- 3. 看是否需要從 auth.users.email 同步 (做為驗證)
-- 用 SECURITY DEFINER function 由 auth.users.email 推回 profile.id 然後 upgrade
DO $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.id AND lower(u.email) = 'luffysky00@gmail.com'
  )
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'owner', updated_at = NOW() WHERE id = v_profile_id AND role != 'owner';
  END IF;
END $$;
