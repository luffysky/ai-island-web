-- 學習進度細節（跨裝置同步）
-- 1) reading_position：每 user 每章記「目前停留位置(current)」+「最遠到達(furthest)」
--    → 綠寶 / 章節頁的「繼續上次閱讀」與「接續學習進度」兩種跳轉。
-- 2) lesson_engagement：每 user 每課記捲動深度% / 停留時間 / miniQuiz 答對 / playground 跑過
--    → 區分「掃過去」vs「認真讀完」vs「學會了（掌握）」。
-- 皆冪等（IF NOT EXISTS）、跨裝置以 localStorage 為離線快取、登入後跟此表雙向合併。
-- 注意：不加 chapter_id BETWEEN 1 AND 60 的 CHECK（章節已到 79+）。

-- ============ 1. reading_position ============
CREATE TABLE IF NOT EXISTS public.reading_position (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT NOT NULL,
  -- 目前停留（精確回到上次那一行）
  current_lesson_id TEXT,
  current_lesson_index INT,
  current_lesson_number TEXT,
  current_lesson_title TEXT,
  -- 最遠到達（學習進度；回頭複習不倒退）
  furthest_lesson_id TEXT,
  furthest_lesson_index INT,
  furthest_lesson_number TEXT,
  furthest_lesson_title TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, chapter_id)
);

-- 全站「最近活躍章」靠 updated_at DESC 取第一筆
CREATE INDEX IF NOT EXISTS idx_reading_position_recent
  ON public.reading_position(user_id, updated_at DESC);

ALTER TABLE public.reading_position ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_position_own" ON public.reading_position;
CREATE POLICY "reading_position_own" ON public.reading_position
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ 2. lesson_engagement ============
CREATE TABLE IF NOT EXISTS public.lesson_engagement (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT NOT NULL,
  lesson_id TEXT NOT NULL,
  scroll_depth REAL NOT NULL DEFAULT 0,      -- 0..1：這課讀過的最大比例（#2）
  dwell_ms BIGINT NOT NULL DEFAULT 0,        -- 累計停留毫秒（#4）
  quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,-- miniQuiz 答對過（#3）
  playground_run BOOLEAN NOT NULL DEFAULT FALSE, -- 跑過 playground（#3）
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_engagement_chapter
  ON public.lesson_engagement(user_id, chapter_id);

ALTER TABLE public.lesson_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_engagement_own" ON public.lesson_engagement;
CREATE POLICY "lesson_engagement_own" ON public.lesson_engagement
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
