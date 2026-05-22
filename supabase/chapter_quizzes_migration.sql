-- Chapter end-of-chapter quizzes（章末 20 題綜合測驗）。
-- 每章一筆。questions 為 JSONB 陣列。
-- 配 admin /admin/chapters/<id>/quiz-builder UI 與 AI 出題助手。

CREATE TABLE IF NOT EXISTS public.chapter_quizzes (
  chapter_id      INT PRIMARY KEY,
  title           TEXT,
  description     TEXT,
  xp_per_correct  INT NOT NULL DEFAULT 5,
  passing_score   INT NOT NULL DEFAULT 16,
  questions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapter_quizzes_published
  ON public.chapter_quizzes(chapter_id) WHERE is_published = true;

ALTER TABLE public.chapter_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapter_quizzes_public_read" ON public.chapter_quizzes;
CREATE POLICY "chapter_quizzes_public_read"
  ON public.chapter_quizzes
  FOR SELECT
  USING (is_published = true);
