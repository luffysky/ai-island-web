-- AI cost alert threshold: 每把 key 可設超過月預算多少 % 觸發警示。
-- 與站台 dashboard widget + audit log 共用。

ALTER TABLE public.ai_api_keys
  ADD COLUMN IF NOT EXISTS alert_threshold_pct INT DEFAULT 80;
