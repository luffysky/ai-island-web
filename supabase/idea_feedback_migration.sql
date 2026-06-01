-- 「給我一個點子」回饋迴路：點子 👍/👎
-- likedStyleSummary() 讀 feedback='up' 的點子，把使用者品味餵回生成 prompt

ALTER TABLE public.generated_ideas
  ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('up', 'down'));
