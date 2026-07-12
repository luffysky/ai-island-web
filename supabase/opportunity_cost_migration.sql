-- 機會島：參賽成本欄位（Agent2.md ⭐⭐⭐⭐⭐——比獎金還重要的資訊）。
-- 冪等、加法。跑法：貼進 Supabase SQL editor。

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;      -- 全程線上（不用到現場）
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS requires_qa boolean DEFAULT false;     -- 需現場 QA 問答
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS requires_team boolean DEFAULT false;    -- 一定要組隊
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS prep_effort text;                       -- 預估準備成本：light|medium|heavy
