-- profiles 加「即時通知 opt-out」欄位
-- user 可關掉「我的活動即時推 LINE 給 admin」、但 DB 仍照常記錄（不影響 KPI / 分析）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_admin_optout boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.notify_admin_optout IS
  'true = user 不希望自己的活動被即時推 LINE 通知到 admin（DB 仍寫入、不影響統計）';
