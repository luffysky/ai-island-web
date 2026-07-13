-- AI 員工辦公室：排程自動跑（cron 員工）。每位員工可設每天/每週自動執行某職能。
-- 冪等、加法。跑法：貼進 Supabase SQL editor（或 node scripts/run-sql.mjs supabase/agent_schedules_migration.sql）。
-- 對外動作紅線不變：排程只「發起任務」，任務內若要對外（發文/報名）仍走既有 awaiting_approval 待批准。

CREATE TABLE IF NOT EXISTS public.agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES public.agent_skills(id) ON DELETE SET NULL,  -- 綁哪位員工（可空＝通用分身）
  title text NOT NULL DEFAULT '',                 -- 排程顯示名（如「每天早上找機會」）
  goal text NOT NULL,                             -- 每次自動執行的指令
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  hour int NOT NULL DEFAULT 9 CHECK (hour BETWEEN 0 AND 23),        -- 台灣時間的小時
  weekday int CHECK (weekday BETWEEN 0 AND 6),    -- 0=週日..6=週六；只有 weekly 用
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_task_id uuid,                              -- 最近一次觸發的任務（給 UI 連結）
  next_run_at timestamptz NOT NULL,               -- 下次該跑的絕對 UTC 時間（cron 靠這個判斷到期）
  run_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_user ON public.agent_schedules(user_id, created_at DESC);
-- cron 撈「到期又啟用」的排程用
CREATE INDEX IF NOT EXISTS idx_agent_schedules_due ON public.agent_schedules(enabled, next_run_at);

ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_schedules_own ON public.agent_schedules;
CREATE POLICY agent_schedules_own ON public.agent_schedules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
