-- 修正：notify_admin_optout 預設值改回 false
-- toggle 預設關 = 不啟用低調模式 = admin 預設收得到通知
-- user 想要才主動「啟用低調模式」（自己關掉播報）

ALTER TABLE public.profiles
  ALTER COLUMN notify_admin_optout SET DEFAULT false;

-- 既有 user 之前一刀切設成 true 的也改回 false
UPDATE public.profiles
SET notify_admin_optout = false
WHERE notify_admin_optout = true;

COMMENT ON COLUMN public.profiles.notify_admin_optout IS
  'true = user 主動啟用低調模式、不即時播報活動到平台運營端。預設 false（admin 收得到）。';
