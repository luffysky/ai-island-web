-- increment_profile_xp(p_user_id uuid, p_amount int)
-- Caller: src/app/api/quiz/today/submit/route.ts:58 -> { p_user_id, p_amount }
-- Adds p_amount to profiles.xp. NOTE: profiles.level is a GENERATED column
--   (LEAST(60, GREATEST(1, floor(sqrt(xp/100))::int + 1))) so it is NOT written here; the DB
--   recomputes it automatically. Records an xp_events row. SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.increment_profile_xp(p_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_old bigint;
  v_new bigint;
  v_level integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'increment_profile_xp: p_user_id is null';
  END IF;

  SELECT xp INTO v_old FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'increment_profile_xp: profile % not found', p_user_id;
  END IF;

  v_new := GREATEST(0, COALESCE(v_old, 0) + COALESCE(p_amount, 0));

  -- level is a generated column derived from xp; update xp only, then read the computed level back.
  UPDATE profiles SET xp = v_new WHERE id = p_user_id
  RETURNING level INTO v_level;

  INSERT INTO xp_events (user_id, amount, reason, meta)
  VALUES (p_user_id, COALESCE(p_amount, 0), 'quiz_daily', jsonb_build_object('source', 'rpc_increment_profile_xp'));

  RETURN jsonb_build_object('ok', true, 'xp', v_new, 'level', v_level);
END;
$$;
