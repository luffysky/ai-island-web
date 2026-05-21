-- ============================================================
-- 每日簽到系統
-- 簽到只給 XP（Z-coin 之後跨專案串接 Insight 經濟後再加）
-- ============================================================

-- 簽到紀錄（每人每天最多一筆）
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_count INT NOT NULL DEFAULT 1,     -- 簽到當下的連續天數
  xp_awarded   INT NOT NULL DEFAULT 0,     -- 當天簽到給的 XP
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user
  ON public.daily_checkins(user_id, checkin_date DESC);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_own_select" ON public.daily_checkins;
CREATE POLICY "checkins_own_select" ON public.daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

-- 簽到只能透過 RPC（SECURITY DEFINER）寫入、不開放直接 insert

-- ============================================================
-- 簽到 RPC：do_checkin
-- 回傳 JSON：{ ok, already, streak, xp_awarded, day_in_cycle }
-- 連續簽到 XP 遞增：第 1~7 天 = 10/15/20/25/30/40/60、之後每天 60
-- 中斷一天連續歸 1
-- ============================================================
CREATE OR REPLACE FUNCTION public.do_checkin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_today       DATE := CURRENT_DATE;
  v_last        DATE;
  v_last_streak INT;
  v_new_streak  INT;
  v_xp          INT;
  v_day_in_cycle INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  -- 今天已簽到？
  IF EXISTS (
    SELECT 1 FROM daily_checkins
    WHERE user_id = v_user_id AND checkin_date = v_today
  ) THEN
    SELECT streak_count INTO v_last_streak
    FROM daily_checkins
    WHERE user_id = v_user_id AND checkin_date = v_today;
    RETURN jsonb_build_object(
      'ok', true, 'already', true,
      'streak', v_last_streak,
      'day_in_cycle', ((v_last_streak - 1) % 7) + 1
    );
  END IF;

  -- 取上次簽到
  SELECT checkin_date, streak_count INTO v_last, v_last_streak
  FROM daily_checkins
  WHERE user_id = v_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  -- 計算新連續天數
  IF v_last IS NULL THEN
    v_new_streak := 1;
  ELSIF v_last = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_last_streak + 1;     -- 昨天有簽 → 連續 +1
  ELSE
    v_new_streak := 1;                      -- 中斷 → 重來
  END IF;

  -- 7 天一輪、第幾天
  v_day_in_cycle := ((v_new_streak - 1) % 7) + 1;

  -- XP 遞增表（依週期內第幾天）
  v_xp := CASE v_day_in_cycle
    WHEN 1 THEN 10
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    WHEN 4 THEN 25
    WHEN 5 THEN 30
    WHEN 6 THEN 40
    WHEN 7 THEN 60
    ELSE 10
  END;

  -- 寫簽到紀錄
  INSERT INTO daily_checkins(user_id, checkin_date, streak_count, xp_awarded)
  VALUES (v_user_id, v_today, v_new_streak, v_xp);

  -- 發 XP：寫 xp_events + 更新 profiles.xp
  INSERT INTO xp_events(user_id, amount, reason, meta)
  VALUES (v_user_id, v_xp, 'daily_checkin',
          jsonb_build_object('streak', v_new_streak, 'day', v_day_in_cycle));

  UPDATE profiles
  SET xp = xp + v_xp,
      streak_days = GREATEST(streak_days, v_new_streak)
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true, 'already', false,
    'streak', v_new_streak,
    'xp_awarded', v_xp,
    'day_in_cycle', v_day_in_cycle
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.do_checkin() TO authenticated;

-- 查詢用：取某用戶最近簽到狀態
CREATE OR REPLACE FUNCTION public.get_checkin_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_last    DATE;
  v_streak  INT;
  v_checked BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT checkin_date, streak_count INTO v_last, v_streak
  FROM daily_checkins
  WHERE user_id = v_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  v_checked := (v_last = v_today);

  -- 若上次簽到不是今天也不是昨天 → 連續已斷
  IF v_last IS NULL OR (v_last < v_today - INTERVAL '1 day') THEN
    v_streak := 0;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'checked_today', COALESCE(v_checked, false),
    'streak', COALESCE(v_streak, 0),
    'day_in_cycle', CASE WHEN COALESCE(v_streak,0) = 0 THEN 0
                         ELSE ((v_streak - 1) % 7) + 1 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_checkin_status() TO authenticated;
