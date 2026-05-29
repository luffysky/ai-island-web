-- 每 user 每月 AI 行為 quota（按 action_type 分）
-- 林董規格：
--   tutor_thread: 10 個對話串 / 月（不能刪、即使刪了 count 不減）
--   resume: 3 / 月
--   interview: 3 / 月
--   challenge: 3 / 月
--   subscription_rec: 5 / 月
--   blog_write: 3 / 月
--   pet_quest_gen: 30 / 月（每天 1 個夠）
--   ...

CREATE TABLE IF NOT EXISTS public.user_ai_action_quota (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL,
  month_iso    TEXT NOT NULL,                  -- '2026-05'
  count        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, action_type, month_iso)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_action_quota_user ON public.user_ai_action_quota(user_id, month_iso);

ALTER TABLE public.user_ai_action_quota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_ai_action_quota_own ON public.user_ai_action_quota;
CREATE POLICY user_ai_action_quota_own ON public.user_ai_action_quota
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RPC: 試扣 + 回 quota 狀態。Free user 超 cap 回 ok=false
CREATE OR REPLACE FUNCTION public.consume_ai_action(
  p_user_id UUID,
  p_action_type TEXT,
  p_cap INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_month TEXT := to_char(NOW(), 'YYYY-MM');
  v_used INTEGER;
BEGIN
  -- 拿當月 count（沒就當 0）
  SELECT count INTO v_used
    FROM public.user_ai_action_quota
   WHERE user_id = p_user_id AND action_type = p_action_type AND month_iso = v_month;
  v_used := COALESCE(v_used, 0);

  IF v_used >= p_cap THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'monthly_quota_exceeded',
      'cap', p_cap,
      'used', v_used,
      'remaining', 0
    );
  END IF;

  -- 累加
  INSERT INTO public.user_ai_action_quota (user_id, action_type, month_iso, count)
       VALUES (p_user_id, p_action_type, v_month, 1)
  ON CONFLICT (user_id, action_type, month_iso)
  DO UPDATE SET count = user_ai_action_quota.count + 1, updated_at = NOW();

  RETURN jsonb_build_object(
    'ok', true,
    'cap', p_cap,
    'used', v_used + 1,
    'remaining', p_cap - (v_used + 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.consume_ai_action(UUID, TEXT, INTEGER) TO authenticated, service_role;

-- 查當月 quota 狀態（不扣）
CREATE OR REPLACE FUNCTION public.check_ai_action(
  p_user_id UUID,
  p_action_type TEXT,
  p_cap INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_month TEXT := to_char(NOW(), 'YYYY-MM');
  v_used INTEGER;
BEGIN
  SELECT count INTO v_used
    FROM public.user_ai_action_quota
   WHERE user_id = p_user_id AND action_type = p_action_type AND month_iso = v_month;
  v_used := COALESCE(v_used, 0);
  RETURN jsonb_build_object(
    'cap', p_cap,
    'used', v_used,
    'remaining', GREATEST(0, p_cap - v_used),
    'allow', v_used < p_cap
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_ai_action(UUID, TEXT, INTEGER) TO authenticated, service_role;
