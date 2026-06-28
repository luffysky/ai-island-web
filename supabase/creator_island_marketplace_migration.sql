-- Creator Island Phase2 — Marketplace（Z 幣 phase1；抽成 0%、賣家收款進 workspace wallet）。
-- 真金流/KYC 仍 future（D14）。買方扣既有 profiles.z_coin + coin_transactions。冪等。

CREATE TABLE IF NOT EXISTS public.ci_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,  -- 賣家
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  asset_id      UUID NOT NULL,
  asset_type    TEXT NOT NULL CHECK (asset_type IN ('fragment','work','package','workflow')),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price_z       INTEGER NOT NULL DEFAULT 0 CHECK (price_z >= 0),
  ai_generated_label TEXT,
  status        TEXT NOT NULL DEFAULT 'listed' CHECK (status IN ('listed','unlisted','suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_listings_status ON public.ci_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_listings_ws ON public.ci_listings(workspace_id);

CREATE TABLE IF NOT EXISTS public.ci_marketplace_transactions (
  id                 BIGSERIAL PRIMARY KEY,
  listing_id         UUID REFERENCES public.ci_listings(id) ON DELETE SET NULL,
  buyer_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_workspace_id UUID REFERENCES public.ci_workspaces(id) ON DELETE SET NULL,
  asset_id           UUID NOT NULL,
  asset_type         TEXT NOT NULL,
  price_z            INTEGER NOT NULL,
  platform_fee_z     INTEGER NOT NULL DEFAULT 0,
  seller_net_z       INTEGER NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_mtx_buyer ON public.ci_marketplace_transactions(buyer_id);

CREATE TABLE IF NOT EXISTS public.ci_entitlements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id BIGINT REFERENCES public.ci_marketplace_transactions(id) ON DELETE SET NULL,
  buyer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id       UUID NOT NULL,
  asset_type     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_entitlements ON public.ci_entitlements(buyer_id, asset_id);

ALTER TABLE public.ci_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_listings_read ON public.ci_listings;
CREATE POLICY ci_listings_read ON public.ci_listings FOR SELECT USING (status = 'listed' OR public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_mtx_read ON public.ci_marketplace_transactions;
CREATE POLICY ci_mtx_read ON public.ci_marketplace_transactions FOR SELECT USING (buyer_id = auth.uid());
DROP POLICY IF EXISTS ci_entitlements_read ON public.ci_entitlements;
CREATE POLICY ci_entitlements_read ON public.ci_entitlements FOR SELECT USING (buyer_id = auth.uid());

-- 購買：原子。抽成 0%（v_fee=0）、賣家淨額進 workspace wallet。買方扣 profiles.z_coin + coin_transactions。
CREATE OR REPLACE FUNCTION public.ci_purchase_listing(p_listing_id UUID, p_buyer UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price INTEGER; v_seller_ws UUID; v_asset UUID; v_atype TEXT; v_status TEXT;
  v_bal INTEGER; v_fee INTEGER; v_net INTEGER; v_tx BIGINT; v_wbal INTEGER;
BEGIN
  SELECT price_z, workspace_id, asset_id, asset_type, status
    INTO v_price, v_seller_ws, v_asset, v_atype, v_status
    FROM public.ci_listings WHERE id = p_listing_id FOR UPDATE;
  IF v_price IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_status <> 'listed' THEN RETURN jsonb_build_object('ok', false, 'error', 'not_listed'); END IF;

  IF EXISTS (SELECT 1 FROM public.ci_entitlements WHERE buyer_id = p_buyer AND asset_id = v_asset) THEN
    RETURN jsonb_build_object('ok', true, 'already_owned', true);
  END IF;

  SELECT z_coin INTO v_bal FROM public.profiles WHERE id = p_buyer FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_funds', 'balance', COALESCE(v_bal,0), 'need', v_price);
  END IF;

  v_fee := 0;                 -- 平台抽成 0%（林董決定）
  v_net := v_price - v_fee;

  -- 扣買方
  UPDATE public.profiles SET z_coin = z_coin - v_price WHERE id = p_buyer;
  INSERT INTO public.coin_transactions(user_id, amount, balance_after, reason, meta)
  VALUES (p_buyer, -v_price, v_bal - v_price, 'ci_marketplace_purchase', jsonb_build_object('listing', p_listing_id));

  -- 加賣方 workspace wallet
  IF v_seller_ws IS NOT NULL AND v_net > 0 THEN
    INSERT INTO public.ci_workspace_wallet(workspace_id, balance) VALUES (v_seller_ws, 0)
      ON CONFLICT (workspace_id) DO NOTHING;
    UPDATE public.ci_workspace_wallet SET balance = balance + v_net, updated_at = NOW()
      WHERE workspace_id = v_seller_ws RETURNING balance INTO v_wbal;
    INSERT INTO public.ci_workspace_wallet_tx(workspace_id, user_id, amount, balance_after, reason, meta)
    VALUES (v_seller_ws, p_buyer, v_net, v_wbal, 'marketplace_sale', jsonb_build_object('listing', p_listing_id));
  END IF;

  INSERT INTO public.ci_marketplace_transactions(listing_id, buyer_id, seller_workspace_id, asset_id, asset_type, price_z, platform_fee_z, seller_net_z)
  VALUES (p_listing_id, p_buyer, v_seller_ws, v_asset, v_atype, v_price, v_fee, v_net) RETURNING id INTO v_tx;
  INSERT INTO public.ci_entitlements(transaction_id, buyer_id, asset_id, asset_type) VALUES (v_tx, p_buyer, v_asset, v_atype);

  RETURN jsonb_build_object('ok', true, 'transaction', v_tx, 'spent', v_price);
END;
$$;
