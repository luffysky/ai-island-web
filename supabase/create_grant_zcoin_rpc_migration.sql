-- grant_zcoin(p_user_id uuid, p_amount int, p_reason text)
-- Callers pass { p_user_id, p_amount, p_reason }:
--   src/app/api/island/{catch-fish,claim-achievement,claim-fortune,claim-quest,open-chest,redeem,villager-greet}/route.ts
--   src/lib/line-postback.ts:85
-- Adds p_amount to profiles.z_coin (floored at 0), records a coin_transactions row with balance_after.
-- Mirrors src/app/api/admin/grant/zcoin/route.ts column writes. SECURITY DEFINER so service-role & RLS callers both work.
CREATE OR REPLACE FUNCTION public.grant_zcoin(p_user_id uuid, p_amount integer, p_reason text)
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
    RAISE EXCEPTION 'grant_zcoin: p_user_id is null';
  END IF;

  SELECT z_coin INTO v_old FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_zcoin: profile % not found', p_user_id;
  END IF;

  v_new := GREATEST(0, COALESCE(v_old, 0) + COALESCE(p_amount, 0));
  v_applied := v_new - COALESCE(v_old, 0);

  UPDATE profiles SET z_coin = v_new WHERE id = p_user_id;

  INSERT INTO coin_transactions (user_id, amount, balance_after, reason, meta)
  VALUES (
    p_user_id,
    v_applied,
    v_new,
    COALESCE(NULLIF(p_reason, ''), 'grant_zcoin'),
    jsonb_build_object('source', 'rpc_grant_zcoin', 'requested_amount', p_amount)
  );

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new, 'delta', v_applied);
END;
$$;
