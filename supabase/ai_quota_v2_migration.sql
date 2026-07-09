-- AI 額度 v2：分「免費/中階(free)」與「高階(high)」兩種每日計數；超過每日免費額度可用 Z幣加購。
-- 設計：
--   free：免費用戶每日 N 次免費模型；超過 → 每次扣少量 Z幣（免費模型成本≈0）。
--   high：Plus/Pro 每日有限高階次數；超過 → 每次扣較多 Z幣（cover 真實成本）。
--   特權(ai_unlimited/owner) 一律不進此函式（route 端跳過）。

ALTER TABLE public.ai_daily_quota ADD COLUMN IF NOT EXISTS high_used INT DEFAULT 0;

CREATE OR REPLACE FUNCTION public.consume_ai_quota_v2(
  p_user_id uuid,
  p_kind text,           -- 'free' | 'high'
  p_daily_limit int,     -- 該 kind 每日免費上限
  p_zcoin_price int,     -- 超過後每次扣多少 Z幣
  p_allow_zcoin boolean  -- 前端已確認要花 Z幣（否則超額只回 need_zcoin、不扣）
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used int;
  v_bal int;
BEGIN
  INSERT INTO public.ai_daily_quota(date, user_id) VALUES (CURRENT_DATE, p_user_id)
    ON CONFLICT (date, user_id) DO NOTHING;

  SELECT CASE WHEN p_kind = 'high' THEN COALESCE(high_used, 0) ELSE COALESCE(free_used, 0) END
    INTO v_used FROM public.ai_daily_quota WHERE date = CURRENT_DATE AND user_id = p_user_id;

  -- 還在每日免費額度內 → 直接放行、計數 +1
  IF v_used < p_daily_limit THEN
    IF p_kind = 'high' THEN
      UPDATE public.ai_daily_quota SET high_used = COALESCE(high_used, 0) + 1 WHERE date = CURRENT_DATE AND user_id = p_user_id;
    ELSE
      UPDATE public.ai_daily_quota SET free_used = COALESCE(free_used, 0) + 1 WHERE date = CURRENT_DATE AND user_id = p_user_id;
    END IF;
    RETURN jsonb_build_object('ok', true, 'charged', 0, 'used', v_used + 1, 'limit', p_daily_limit);
  END IF;

  -- 超過每日免費額度 → 需 Z幣加購
  IF NOT p_allow_zcoin OR p_zcoin_price <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'need_zcoin', 'price', p_zcoin_price, 'limit', p_daily_limit, 'used', v_used);
  END IF;

  SELECT COALESCE(z_coin, 0) INTO v_bal FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_bal < p_zcoin_price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_zcoin', 'price', p_zcoin_price, 'balance', v_bal);
  END IF;

  -- 扣 Z幣 + 記帳 + 計數 +1（原子）
  UPDATE public.profiles SET z_coin = z_coin - p_zcoin_price WHERE id = p_user_id;
  INSERT INTO public.coin_transactions(user_id, amount, balance_after, reason, meta)
    VALUES (p_user_id, -p_zcoin_price, v_bal - p_zcoin_price, 'ai_overflow_' || p_kind,
            jsonb_build_object('source', 'consume_ai_quota_v2', 'kind', p_kind));
  IF p_kind = 'high' THEN
    UPDATE public.ai_daily_quota SET high_used = COALESCE(high_used, 0) + 1 WHERE date = CURRENT_DATE AND user_id = p_user_id;
  ELSE
    UPDATE public.ai_daily_quota SET free_used = COALESCE(free_used, 0) + 1 WHERE date = CURRENT_DATE AND user_id = p_user_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'charged', p_zcoin_price, 'balance', v_bal - p_zcoin_price);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_quota_v2(uuid, text, int, int, boolean) TO authenticated, service_role;
