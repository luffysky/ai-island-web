-- Fix daily_quests RPCs: align column names to the REAL table schema.
--
-- Real daily_quests columns:
--   id, user_id, quest_date, quest_type, target, progress,
--   completed, claimed, xp_reward, z_coin_reward
--
-- Bugs fixed:
--   1) ensure_daily_quests   INSERTed into (reward_xp, reward_z)   -> do not exist -> insert threw -> 0 quests ever created.
--   2) claim_quest_reward    read v_quest.reward_xp / v_quest.reward_z  -> renamed to xp_reward / z_coin_reward.
--   3) claim_quest_reward    SET claimed_at = NOW()  -> column does not exist -> removed.
--   4) increment_quest_progress  SET completed_at = ... -> column does not exist -> removed.
--
-- Only column names / non-existent-column writes changed. Logic, signatures,
-- SECURITY DEFINER, search_path, and the RETURN json keys are all preserved.
-- (RETURN keys 'reward_xp'/'reward_z' are output labels the frontend claim handler
--  reads via j.reward_xp / j.reward_z, so they are intentionally kept.)

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_daily_quests()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_count   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT COUNT(*) INTO v_count FROM daily_quests
  WHERE user_id = v_user_id AND quest_date = v_today;

  IF v_count > 0 THEN
    RETURN jsonb_build_object('ok', true, 'created', 0, 'existing', v_count);
  END IF;

  -- 預設 4 個任務（每天）
  INSERT INTO daily_quests(user_id, quest_date, quest_type, target, xp_reward, z_coin_reward) VALUES
    (v_user_id, v_today, 'complete_lessons', 3, 30, 10),
    (v_user_id, v_today, 'daily_checkin',    1, 10, 5),
    (v_user_id, v_today, 'ai_chat',          1, 10, 3),
    (v_user_id, v_today, 'daily_quiz',       1, 20, 8)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'created', 4);
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_quest_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID := auth.uid();
  v_quest    daily_quests%ROWTYPE;
  v_balance  INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT * INTO v_quest FROM daily_quests WHERE id = p_quest_id AND user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_quest.claimed THEN RETURN jsonb_build_object('ok', false, 'error', 'already_claimed'); END IF;
  IF NOT v_quest.completed THEN RETURN jsonb_build_object('ok', false, 'error', 'not_completed'); END IF;

  -- 標記領取（claimed_at 欄位不存在、移除）
  UPDATE daily_quests SET claimed = true WHERE id = p_quest_id;

  -- 發 XP + z 幣
  INSERT INTO xp_events(user_id, amount, reason, meta)
  VALUES (v_user_id, v_quest.xp_reward, 'quest_reward', jsonb_build_object('quest_type', v_quest.quest_type));

  UPDATE profiles
  SET xp = xp + v_quest.xp_reward,
      z_coin = COALESCE(z_coin, 0) + v_quest.z_coin_reward
  WHERE id = v_user_id
  RETURNING z_coin INTO v_balance;

  INSERT INTO coin_transactions(user_id, amount, balance_after, reason, meta)
  VALUES (v_user_id, v_quest.z_coin_reward, COALESCE(v_balance, v_quest.z_coin_reward), 'quest_reward', jsonb_build_object('quest_type', v_quest.quest_type));

  RETURN jsonb_build_object(
    'ok', true,
    'reward_xp', v_quest.xp_reward,
    'reward_z', v_quest.z_coin_reward,
    'z_balance', v_balance
  );
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_quest_progress(p_quest_type text, p_delta integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_quest   daily_quests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT * INTO v_quest FROM daily_quests
  WHERE user_id = v_user_id AND quest_date = v_today AND quest_type = p_quest_type;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'skipped', 'no_quest'); END IF;
  IF v_quest.completed THEN RETURN jsonb_build_object('ok', true, 'skipped', 'already_completed'); END IF;

  -- completed_at 欄位不存在、移除
  UPDATE daily_quests
  SET progress = LEAST(target, progress + p_delta),
      completed = (progress + p_delta >= target)
  WHERE id = v_quest.id
  RETURNING * INTO v_quest;

  RETURN jsonb_build_object(
    'ok', true,
    'progress', v_quest.progress,
    'target', v_quest.target,
    'completed', v_quest.completed
  );
END;
$function$;
