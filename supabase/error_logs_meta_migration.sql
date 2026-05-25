-- 補 error_logs.meta 欄位 (webhook / API 寫錯誤紀錄要)
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'error';

CREATE INDEX IF NOT EXISTS idx_error_logs_source ON public.error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
