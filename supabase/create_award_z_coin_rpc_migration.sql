-- award_z_coin(p_user_id uuid, p_amount int, p_reason text)
-- Caller: src/app/api/me/pet/quest/route.ts:159 -> { p_user_id, p_amount, p_reason }
-- Same semantics as grant_zcoin. Kept as its own function because the caller uses this exact name.
CREATE OR REPLACE FUNCTION public.award_z_coin(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_old integer;
  v_new integer;
  v_applied integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'award_z_coin: p_user_id is null';
  END IF;

  SELECT z_coin INTO v_old FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'award_z_coin: profile % not found', p_user_id;
  END IF;

  v_new := GREATEST(0, COALESCE(v_old, 0) + COALESCE(p_amount, 0));
  v_applied := v_new - COALESCE(v_old, 0);

  UPDATE profiles SET z_coin = v_new WHERE id = p_user_id;

  INSERT INTO coin_transactions (user_id, amount, balance_after, reason, meta)
  VALUES (
    p_user_id,
    v_applied,
    v_new,
    COALESCE(NULLIF(p_reason, ''), 'award_z_coin'),
    jsonb_build_object('source', 'rpc_award_z_coin', 'requested_amount', p_amount)
  );

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new, 'delta', v_applied);
END;
$$;
