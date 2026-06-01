-- 「給我一個點子」第二階段：每日自動推薦
-- generated_ideas 加一個 daily_date：標記某天的「今日點子」、每天最多一個

ALTER TABLE public.generated_ideas
  ADD COLUMN IF NOT EXISTS daily_date DATE;

-- 每個日期只能有一個 daily 點子（NULL 不受限、一般生成的點子不佔位）
CREATE UNIQUE INDEX IF NOT EXISTS uq_generated_ideas_daily_date
  ON public.generated_ideas(daily_date)
  WHERE daily_date IS NOT NULL;
