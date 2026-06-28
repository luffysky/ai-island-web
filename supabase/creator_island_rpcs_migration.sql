-- Creator Island M0 — RPCs（在 workspace migration 之後跑）
-- 依 docs/ideas_os/13_DATABASE.md §Key RPCs。SECURITY DEFINER + 固定 search_path。

-- ============ transfer_workspace_owner ============
-- 原子轉移：舊 owner → manager、目標 → owner。保證永遠剛好一個 owner。
-- 目標必須已是該 workspace 成員。
CREATE OR REPLACE FUNCTION public.ci_transfer_workspace_owner(
  p_workspace_id UUID,
  p_to_user_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_owner UUID;
BEGIN
  SELECT user_id INTO v_old_owner
    FROM public.ci_workspace_members
   WHERE workspace_id = p_workspace_id AND role = 'owner'
   FOR UPDATE;

  IF v_old_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_owner');
  END IF;
  IF v_old_owner = p_to_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_owner');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ci_workspace_members
     WHERE workspace_id = p_workspace_id AND user_id = p_to_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'target_not_member');
  END IF;

  -- 先降舊 owner（避免撞 one-owner 唯一索引），再升新 owner
  UPDATE public.ci_workspace_members
     SET role = 'manager'
   WHERE workspace_id = p_workspace_id AND user_id = v_old_owner;

  UPDATE public.ci_workspace_members
     SET role = 'owner'
   WHERE workspace_id = p_workspace_id AND user_id = p_to_user_id;

  UPDATE public.ci_workspaces
     SET owner_id = p_to_user_id, updated_at = NOW()
   WHERE id = p_workspace_id;

  RETURN jsonb_build_object('ok', true, 'old_owner', v_old_owner, 'new_owner', p_to_user_id);
END;
$$;

-- ============ debit_wallet（workspace 共享 Z 幣額度）============
-- 原子檢查餘額 + 扣款 + 寫 ledger。amount 正=入、負=出。回傳結果 JSON。
CREATE OR REPLACE FUNCTION public.ci_debit_workspace_wallet(
  p_workspace_id UUID,
  p_user_id      UUID,
  p_amount       INTEGER,
  p_reason       TEXT,
  p_meta         JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance INTEGER;
  v_after   INTEGER;
BEGIN
  -- 確保 wallet 存在
  INSERT INTO public.ci_workspace_wallet(workspace_id, balance)
  VALUES (p_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;

  SELECT balance INTO v_balance
    FROM public.ci_workspace_wallet
   WHERE workspace_id = p_workspace_id
   FOR UPDATE;

  v_after := v_balance + p_amount;
  IF v_after < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_funds',
                              'balance', v_balance, 'need', -p_amount);
  END IF;

  UPDATE public.ci_workspace_wallet
     SET balance = v_after, updated_at = NOW()
   WHERE workspace_id = p_workspace_id;

  INSERT INTO public.ci_workspace_wallet_tx(workspace_id, user_id, amount, balance_after, reason, meta)
  VALUES (p_workspace_id, p_user_id, p_amount, v_after, p_reason, p_meta);

  RETURN jsonb_build_object('ok', true, 'balance_after', v_after);
END;
$$;
