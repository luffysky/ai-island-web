-- 在 Supabase SQL Editor 執行（如果還沒）
-- 用戶綁 leetcode username + 快取 stats（每小時 refresh）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leetcode_username TEXT,
  ADD COLUMN IF NOT EXISTS leetcode_stats    JSONB,
  ADD COLUMN IF NOT EXISTS leetcode_stats_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_leetcode ON public.profiles(leetcode_username) WHERE leetcode_username IS NOT NULL;
