-- Agent 島 Phase A：對話延續（把多個任務串成一段連續對話）。
-- 冪等、加法（thread_id 可為 NULL → 舊任務不受影響）。跑法：貼進 Supabase SQL editor。

CREATE TABLE IF NOT EXISTS public.agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,                       -- 首則自動摘要（沒有就用第一個 goal）
  skill_id uuid,                    -- 這串綁的技能（可換、可空）
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_threads_user ON public.agent_threads(user_id, last_message_at DESC);

-- 一個 task = 對話中的一個 user turn
ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.agent_threads(id) ON DELETE CASCADE;
ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS turn_summary text;  -- 該回合結果的精煉摘要（給後續回合當前文）
CREATE INDEX IF NOT EXISTS idx_agent_tasks_thread ON public.agent_tasks(thread_id, created_at);

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_threads_own ON public.agent_threads;
CREATE POLICY agent_threads_own ON public.agent_threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
