-- 修 lesson_progress.chapter_id CHECK 範圍 (原 1~60、實際 71 章、Ch61+ 完全寫不進)
ALTER TABLE public.lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_chapter_id_check;

ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_chapter_id_check
  CHECK (chapter_id >= 1 AND chapter_id <= 200);
