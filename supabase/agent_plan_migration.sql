-- 分身島引擎 L1：任務拆解。agent_tasks 存「計畫」（子任務 checklist）與完成進度。
-- 冪等、加法。跑法：貼進 Supabase SQL editor。

ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS plan jsonb;        -- ["子任務1","子任務2",...]
ALTER TABLE public.agent_tasks ADD COLUMN IF NOT EXISTS plan_done jsonb;   -- 已完成的索引，如 [0,1]
