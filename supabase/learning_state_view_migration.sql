-- ============================================================
-- learning_state_summary view — 每個 user 學習狀態聚合
-- 供 admin AI 即時查詢用
-- ============================================================

DROP VIEW IF EXISTS public.learning_state_summary CASCADE;
DROP VIEW IF EXISTS public.user_weak_chapters CASCADE;
DROP VIEW IF EXISTS public.chapter_stats_summary CASCADE;

CREATE OR REPLACE VIEW public.learning_state_summary AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.role,
  p.level,
  p.xp,
  p.created_at AS joined_at,
  p.last_active_at,
  EXTRACT(DAY FROM NOW() - p.created_at)::int AS joined_days_ago,
  CASE WHEN p.last_active_at IS NOT NULL
    THEN EXTRACT(DAY FROM NOW() - p.last_active_at)::int
    ELSE NULL
  END AS last_active_days_ago,

  COALESCE(lp.lessons_done, 0) AS lessons_completed,
  COALESCE(lp.chapters_touched, 0) AS chapters_touched,

  qz.avg_pct_30d::numeric(5,2) AS quiz_avg_30d,
  COALESCE(qz.quiz_count_30d, 0) AS quiz_total_30d,

  COALESCE(ck.current_streak, 0) AS current_streak,
  ck.last_checkin_date,

  latest.chapter_id AS current_chapter_id,
  latest.lesson_id AS current_lesson_id,
  ch.title AS current_chapter_title
FROM public.profiles p

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE completed = TRUE OR completed_at IS NOT NULL) AS lessons_done,
    COUNT(DISTINCT chapter_id) AS chapters_touched
  FROM public.lesson_progress
  WHERE user_id = p.id
) lp ON TRUE

-- 30 天內 quiz 平均 (score / total_questions * 100)
LEFT JOIN LATERAL (
  SELECT
    AVG(score::numeric / NULLIF(total_questions, 0) * 100) AS avg_pct_30d,
    COUNT(*) AS quiz_count_30d
  FROM public.quiz_attempts
  WHERE user_id = p.id
    AND attempted_at > NOW() - INTERVAL '30 days'
) qz ON TRUE

-- 簽到：最新一筆的 streak_count = current streak (若今天或昨天有簽)
LEFT JOIN LATERAL (
  SELECT
    CASE
      WHEN MAX(checkin_date) >= CURRENT_DATE - INTERVAL '1 day' THEN
        (SELECT streak_count FROM public.daily_checkins dc2
         WHERE dc2.user_id = p.id ORDER BY checkin_date DESC LIMIT 1)
      ELSE 0
    END AS current_streak,
    MAX(checkin_date) AS last_checkin_date
  FROM public.daily_checkins
  WHERE user_id = p.id
) ck ON TRUE

LEFT JOIN LATERAL (
  SELECT chapter_id, lesson_id
  FROM public.lesson_progress
  WHERE user_id = p.id
  ORDER BY COALESCE(completed_at, '1970-01-01'::timestamptz) DESC NULLS LAST, id DESC
  LIMIT 1
) latest ON TRUE

LEFT JOIN public.chapters ch ON ch.id = latest.chapter_id;


-- ============================================================
-- user_weak_chapters view — 每個 user 的弱項章節 (30 天內、平均 < 60、至少 2 次嘗試)
-- ============================================================
CREATE OR REPLACE VIEW public.user_weak_chapters AS
SELECT
  user_id,
  chapter_id,
  AVG(score::numeric / NULLIF(total_questions, 0) * 100)::numeric(5,2) AS avg_pct,
  COUNT(*) AS attempt_count
FROM public.quiz_attempts
WHERE attempted_at > NOW() - INTERVAL '30 days'
  AND chapter_id IS NOT NULL
GROUP BY user_id, chapter_id
HAVING COUNT(*) >= 2 AND AVG(score::numeric / NULLIF(total_questions, 0) * 100) < 60;


-- ============================================================
-- chapter_stats_summary view — 章節整體完成率 / 平均 quiz 分數
-- ============================================================
CREATE OR REPLACE VIEW public.chapter_stats_summary AS
SELECT
  ch.id AS chapter_id,
  ch.title AS chapter_title,
  COUNT(DISTINCT lp.user_id) AS users_started,
  COUNT(DISTINCT CASE WHEN lp.completed = TRUE OR lp.completed_at IS NOT NULL THEN lp.user_id END) AS users_completed,
  COALESCE(
    AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100), 0
  )::numeric(5,2) AS quiz_avg_pct,
  COUNT(qa.id) AS quiz_attempts_count
FROM public.chapters ch
LEFT JOIN public.lesson_progress lp ON lp.chapter_id = ch.id
LEFT JOIN public.quiz_attempts qa ON qa.chapter_id = ch.id
  AND qa.attempted_at > NOW() - INTERVAL '90 days'
GROUP BY ch.id, ch.title
ORDER BY ch.id;
