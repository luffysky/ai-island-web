-- ========================================================================
-- profiles 加 is_owner 旗標 — 讓林董 role 回 'admin' 但仍識別 owner
-- 之前 role='owner' 會被所有 API check `role === "admin"` 擋掉 (99 個檔太多無法批改)
-- 改成：林董 role='admin' (API 全通) + is_owner=true (UI / AI 識別)
-- ========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_owner IS '平台 Owner / 林董旗標、跟 role 解耦、UI 用此判別「林董」';

CREATE INDEX IF NOT EXISTS idx_profiles_is_owner ON public.profiles (is_owner) WHERE is_owner = true;

-- 把 role='owner' 的 user 改回 role='admin' + is_owner=true
UPDATE public.profiles
SET role = 'admin', is_owner = true, updated_at = NOW()
WHERE role = 'owner';

-- 用 username pattern 也標記 owner (保險、即使 role 沒被改成 owner 也涵蓋)
UPDATE public.profiles
SET is_owner = true, updated_at = NOW()
WHERE username ILIKE 'luffysky00%' OR username = 'luffysky004';

-- 從 auth.users.email 也補一筆 (luffysky00@gmail.com)
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.id AND lower(u.email) = 'luffysky00@gmail.com'
  )
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.profiles SET is_owner = true, updated_at = NOW() WHERE id = v_id;
  END IF;
END $$;

-- role check constraint 可以保留 'owner' (向後相容) 但實務上不再用
-- (之前的 migration 已加 owner、不動)
