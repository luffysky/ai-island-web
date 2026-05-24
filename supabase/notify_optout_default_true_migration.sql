-- notify_admin_optout 預設值改 true（預設啟用低調模式、不向運營者即時播報活動）
-- 同時把既有 user 全部設為 true、給大家平等的隱私保護

ALTER TABLE public.profiles
  ALTER COLUMN notify_admin_optout SET DEFAULT true;

UPDATE public.profiles
SET notify_admin_optout = true
WHERE notify_admin_optout = false;

COMMENT ON COLUMN public.profiles.notify_admin_optout IS
  'true = 低調模式（預設）、活動不即時播報；false = 願意分享活動讓平台運營者看到。DB 仍照常記錄、不影響統計。';
