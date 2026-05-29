-- 每 user 月 AI token 上限（防止單一 user 燒爆、ai_unlimited 也要有頂）
-- Free user 預設 100K token / 月、ai_unlimited / Premium 500K / 月

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_monthly_token_cap INTEGER NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS ai_monthly_token_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Premium / unlimited 自動拉高 cap
UPDATE public.profiles
   SET ai_monthly_token_cap = 500000
 WHERE (ai_unlimited = true OR is_owner = true)
   AND ai_monthly_token_cap = 100000;

CREATE INDEX IF NOT EXISTS idx_profiles_token_reset ON public.profiles(ai_monthly_reset_at);

-- RPC: 消耗 + 檢查 cap、月初 auto reset
CREATE OR REPLACE FUNCTION public.consume_ai_token_cap(
  p_user_id UUID,
  p_tokens INTEGER
) RETURNS JSONB AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT ai_monthly_token_cap, ai_monthly_token_used, ai_monthly_reset_at
    INTO r FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found');
  END IF;

  -- 月初 reset (距 reset 超過 30 天)
  IF (NOW() - r.ai_monthly_reset_at) > INTERVAL '30 days' THEN
    UPDATE public.profiles
       SET ai_monthly_token_used = 0,
           ai_monthly_reset_at = NOW()
     WHERE id = p_user_id;
    r.ai_monthly_token_used := 0;
  END IF;

  IF r.ai_monthly_token_used + p_tokens > r.ai_monthly_token_cap THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'monthly_cap_exceeded',
      'cap', r.ai_monthly_token_cap,
      'used', r.ai_monthly_token_used,
      'requested', p_tokens
    );
  END IF;

  UPDATE public.profiles
     SET ai_monthly_token_used = ai_monthly_token_used + p_tokens
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cap', r.ai_monthly_token_cap,
    'used', r.ai_monthly_token_used + p_tokens,
    'remaining', r.ai_monthly_token_cap - (r.ai_monthly_token_used + p_tokens)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.consume_ai_token_cap(UUID, INTEGER) TO authenticated, service_role;
