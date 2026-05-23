-- 簽到 z 幣獎勵升級（林董 2026-05-23）：
--   連續第 1 天 5 z、之後每天 +1、第 11 天起每天 15 z 為上限
--   公式：z = LEAST(15, 4 + streak)
--
-- 同時保留原 XP 表（不動 daily_checkins 表 schema）。
-- daily_checkins 加 z_awarded 欄位（紀錄）。

ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS z_awarded INT NOT NULL DEFAULT 0;

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
  v_zcoin       INT;
  v_day_in_cycle INT;
  v_new_balance INT;
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
    v_new_streak := v_last_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- 7 天一輪、第幾天（XP 用）
  v_day_in_cycle := ((v_new_streak - 1) % 7) + 1;

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

  -- Z 幣：5 + (streak-1)、上限 15
  v_zcoin := LEAST(15, 4 + v_new_streak);

  -- 寫簽到紀錄
  INSERT INTO daily_checkins(user_id, checkin_date, streak_count, xp_awarded, z_awarded)
  VALUES (v_user_id, v_today, v_new_streak, v_xp, v_zcoin);

  -- 發 XP
  INSERT INTO xp_events(user_id, amount, reason, meta)
  VALUES (v_user_id, v_xp, 'daily_checkin',
          jsonb_build_object('streak', v_new_streak, 'day', v_day_in_cycle));

  -- 更新 profile + z_coin
  UPDATE profiles
  SET xp = xp + v_xp,
      z_coin = COALESCE(z_coin, 0) + v_zcoin,
      streak_days = GREATEST(COALESCE(streak_days, 0), v_new_streak)
  WHERE id = v_user_id
  RETURNING z_coin INTO v_new_balance;

  -- 寫 coin_transactions（紀錄）
  INSERT INTO coin_transactions(user_id, amount, balance_after, reason, meta)
  VALUES (v_user_id, v_zcoin, COALESCE(v_new_balance, v_zcoin), 'daily_checkin',
          jsonb_build_object('streak', v_new_streak));

  RETURN jsonb_build_object(
    'ok', true, 'already', false,
    'streak', v_new_streak,
    'xp_awarded', v_xp,
    'z_awarded', v_zcoin,
    'day_in_cycle', v_day_in_cycle,
    'z_balance', COALESCE(v_new_balance, v_zcoin)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.do_checkin() TO authenticated;
