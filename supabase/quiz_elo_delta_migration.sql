-- daily_quiz_attempts 加 elo_delta 欄位、記錄每場測驗用戶 ELO 變化
-- 用於 /me 的 EloProgress 顯示最近 5 場 ELO 變化 sparkline

ALTER TABLE public.daily_quiz_attempts
  ADD COLUMN IF NOT EXISTS elo_delta integer;

COMMENT ON COLUMN public.daily_quiz_attempts.elo_delta IS
  '這場測驗讓使用者 elo_rating 增減多少分（含正負）';

CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_created
  ON public.daily_quiz_attempts (user_id, created_at DESC);
