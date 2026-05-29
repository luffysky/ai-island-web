-- 讓 external_resources 可以綁章節（chapter_id nullable）
-- 章節頁能顯示「這章相關的影片 / 文章 / 工具」

ALTER TABLE public.external_resources
  ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES public.chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ext_res_chapter ON public.external_resources(chapter_id) WHERE active = true AND chapter_id IS NOT NULL;
