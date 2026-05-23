-- S10-S11 進階 features migration
--   §1 寵物進化（pets.evolution_stage + total_z_spent）
--   §2 referral commission（payout 紀錄）
--   §3 ai 自動審核 keyword 規則
--   §4 portfolios（學員作品集）

-- §1 pets 進化
DO $$
BEGIN
  -- 確認 pets 表存在
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pets') THEN
    ALTER TABLE public.pets
      ADD COLUMN IF NOT EXISTS evolution_stage TEXT NOT NULL DEFAULT 'baby'
        CHECK (evolution_stage IN ('baby','child','teen','adult','elder','legendary'));
    ALTER TABLE public.pets
      ADD COLUMN IF NOT EXISTS total_z_spent INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- §2 referral commission：當推薦來的 user 訂閱付款時、給推薦者抽成
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_twd      INTEGER NOT NULL,                  -- 抽成金額
  source          TEXT NOT NULL,                      -- subscription / chapter_purchase
  source_id       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ref_comm_referrer ON public.referral_commissions(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ref_comm_status ON public.referral_commissions(status);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rc_own_select ON public.referral_commissions;
CREATE POLICY rc_own_select ON public.referral_commissions FOR SELECT USING (auth.uid() = referrer_id);
DROP POLICY IF EXISTS rc_admin_all ON public.referral_commissions;
CREATE POLICY rc_admin_all ON public.referral_commissions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- §3 AI 審核關鍵字規則（admin 可改）
CREATE TABLE IF NOT EXISTS public.ai_moderation_keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    TEXT UNIQUE NOT NULL,
  severity   TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','high','critical')),
  category   TEXT NOT NULL DEFAULT 'general',
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_moderation_keywords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS amk_admin_all ON public.ai_moderation_keywords;
CREATE POLICY amk_admin_all ON public.ai_moderation_keywords
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS amk_public_select ON public.ai_moderation_keywords;
CREATE POLICY amk_public_select ON public.ai_moderation_keywords
  FOR SELECT USING (true);

-- 預設高危關鍵字（中英文示範）
INSERT INTO public.ai_moderation_keywords (keyword, severity, category) VALUES
  ('自殺', 'critical', 'self_harm'),
  ('自殘', 'critical', 'self_harm'),
  ('kill myself', 'critical', 'self_harm'),
  ('credit card', 'high', 'pii_leak'),
  ('身分證', 'high', 'pii_leak'),
  ('帳號密碼', 'high', 'pii_leak'),
  ('password is', 'high', 'pii_leak'),
  ('幹', 'warn', 'harassment'),
  ('fuck you', 'warn', 'harassment')
ON CONFLICT (keyword) DO NOTHING;

-- §4 portfolios（學員把 playgrounds 整理成作品集公開頁）
CREATE TABLE IF NOT EXISTS public.portfolios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  cover_image   TEXT,
  tags          TEXT[] DEFAULT '{}',
  playground_ids UUID[] DEFAULT '{}',                 -- references playgrounds.id
  is_public     BOOLEAN NOT NULL DEFAULT true,
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_port_user ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_port_public ON public.portfolios(is_public) WHERE is_public = true;

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS port_public_select ON public.portfolios;
CREATE POLICY port_public_select ON public.portfolios
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS port_own_all ON public.portfolios;
CREATE POLICY port_own_all ON public.portfolios
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS port_admin_all ON public.portfolios;
CREATE POLICY port_admin_all ON public.portfolios
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_portfolios_updated ON public.portfolios;
CREATE TRIGGER trg_portfolios_updated BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.touch_chapter_updated_at();

-- §5 pet evolve RPC
CREATE OR REPLACE FUNCTION public.evolve_pet(p_user_id UUID, p_z_cost INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_balance INTEGER;
  v_current TEXT;
  v_next TEXT;
  v_total_spent INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  SELECT z_coin INTO v_balance FROM profiles WHERE id = p_user_id;
  IF v_balance IS NULL OR v_balance < p_z_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_z');
  END IF;

  SELECT evolution_stage, total_z_spent INTO v_current, v_total_spent FROM pets WHERE user_id = p_user_id;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pet');
  END IF;

  v_next := CASE v_current
    WHEN 'baby' THEN 'child'
    WHEN 'child' THEN 'teen'
    WHEN 'teen' THEN 'adult'
    WHEN 'adult' THEN 'elder'
    WHEN 'elder' THEN 'legendary'
    ELSE NULL
  END;

  IF v_next IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_max');
  END IF;

  -- 扣 z 幣 + 升 stage
  UPDATE profiles SET z_coin = z_coin - p_z_cost WHERE id = p_user_id RETURNING z_coin INTO v_balance;
  UPDATE pets SET evolution_stage = v_next, total_z_spent = COALESCE(total_z_spent, 0) + p_z_cost WHERE user_id = p_user_id;

  INSERT INTO coin_transactions(user_id, amount, balance_after, reason, meta)
  VALUES (p_user_id, -p_z_cost, v_balance, 'pet_evolve', jsonb_build_object('from', v_current, 'to', v_next));

  RETURN jsonb_build_object('ok', true, 'new_stage', v_next, 'z_balance', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.evolve_pet(UUID, INTEGER) TO authenticated;
