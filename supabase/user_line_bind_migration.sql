-- user 端綁 LINE：profiles 加綁定欄位
-- 流程：user 加 admin bot 為好友 → 網站產 6 位 code → user 傳 "/bind <code>" 給 bot →
-- webhook 比對 → 存 line_user_id → 系統通知可推他 LINE

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_user_id text,
  ADD COLUMN IF NOT EXISTS line_notify_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS line_bind_code text,
  ADD COLUMN IF NOT EXISTS line_bind_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS line_bound_at timestamptz;

-- line_user_id 必須唯一（同一個 LINE 不能綁多帳號）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_line_user_id
  ON public.profiles (line_user_id)
  WHERE line_user_id IS NOT NULL;

-- bind code 查詢索引
CREATE INDEX IF NOT EXISTS idx_profiles_line_bind_code
  ON public.profiles (line_bind_code)
  WHERE line_bind_code IS NOT NULL;

COMMENT ON COLUMN public.profiles.line_user_id IS 'LINE Messaging API userId、加 admin bot 為好友後綁定';
COMMENT ON COLUMN public.profiles.line_notify_enabled IS 'true = user 願意收 LINE 通知（綁定後預設 true）';
COMMENT ON COLUMN public.profiles.line_bind_code IS '6 位數字綁定 code、user 從網站拿、5 分鐘有效';
