-- 互動體驗教具：lessons 新增 demos 欄（jsonb 陣列）。
-- 冪等、可重跑。對應 types.ts 的 Lesson.demos / LessonDemo。
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS demos jsonb NOT NULL DEFAULT '[]'::jsonb;
