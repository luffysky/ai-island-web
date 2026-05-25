-- ========================================================================
-- chapters: 加 sort_index 欄
-- 用途：新章節插入既有 stage 中間（例如 ch72 sortIndex=8.5 排 Ch08 跟 Ch09 之間）
-- 無填欄位回退到 id (向後兼容、現有 71 章不需動)
-- ========================================================================

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS sort_index NUMERIC;

COMMENT ON COLUMN public.chapters.sort_index IS
  '顯示排序、可為小數 (例 8.5)。NULL 時回退到 id。前台 / 後台都用 COALESCE(sort_index, id::numeric) 排。';

CREATE INDEX IF NOT EXISTS idx_chapters_sort_index
  ON public.chapters (COALESCE(sort_index, id::numeric));
