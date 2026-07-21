-- 訊息軍師 usage 計數表（每日免費 3 則的計數來源）
--  ⚠️ 刻意「不存訊息內容」：情境常涉敏感隱私（道歉/加薪/前任/客訴），只記一列 usage + 情境/語氣做分析。
--  免費額度＝COUNT 今天（台北日）的列數；付費/特權跳過此表。
-- 跑法：node scripts/run-sql.mjs supabase/message_coach_migration.sql

CREATE TABLE IF NOT EXISTS public.message_coach_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario    TEXT,
  tone        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_coach_logs_user_time
  ON public.message_coach_logs(user_id, created_at);

ALTER TABLE public.message_coach_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_coach_logs_own_read ON public.message_coach_logs;
CREATE POLICY message_coach_logs_own_read ON public.message_coach_logs
  FOR SELECT USING (auth.uid() = user_id);
-- 寫入一律走 service_role（API 記帳）、不開 public write
