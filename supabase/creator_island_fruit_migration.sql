-- Creator Island — 果實 (Fruit)：創作者收入貨幣
-- 與 Z 幣 / Dust 完全分離（反洗幣）：不可用真錢購買、只能從「賣作品/被打賞」賺得。
-- 之後若開真金流提現，只有果實可提現、Z 幣永遠不可（購買的 Z 幣是 sink）。
-- 命名見 memory creator-island-silent-bugs / ideas-os-creator-island。

CREATE TABLE IF NOT EXISTS public.ci_fruit_ledger (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id  UUID REFERENCES public.ci_workspaces(id) ON DELETE SET NULL,
  amount        INTEGER NOT NULL,             -- 正=賺、負=花/提現
  balance_after INTEGER NOT NULL,
  reason        TEXT NOT NULL,                -- marketplace_sale｜tip｜withdraw｜adjust
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_fruit_ledger_user ON public.ci_fruit_ledger(user_id, id DESC);

ALTER TABLE public.ci_fruit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_fruit_own_read ON public.ci_fruit_ledger;
CREATE POLICY ci_fruit_own_read ON public.ci_fruit_ledger FOR SELECT USING (user_id = auth.uid());
-- 寫入一律走 service-role / SECURITY DEFINER RPC，故不開 INSERT policy。

-- 原子交易（仿 ci_dust_tx）：餘額不可為負。
CREATE OR REPLACE FUNCTION public.ci_fruit_tx(
  p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_meta JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal INTEGER; v_after INTEGER;
BEGIN
  SELECT COALESCE((SELECT balance_after FROM public.ci_fruit_ledger WHERE user_id = p_user_id ORDER BY id DESC LIMIT 1), 0) INTO v_bal;
  v_after := v_bal + p_amount;
  IF v_after < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_fruit', 'balance', v_bal);
  END IF;
  INSERT INTO public.ci_fruit_ledger(user_id, workspace_id, amount, balance_after, reason, meta)
  VALUES (p_user_id, NULLIF(p_meta->>'workspace_id','')::uuid, p_amount, v_after, p_reason, p_meta);
  RETURN jsonb_build_object('ok', true, 'balance_after', v_after);
END;
$$;
