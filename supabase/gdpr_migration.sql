-- LT-14 GDPR 合規（Art.15 資料匯出 / Art.17 刪除權）
--
-- 1. profiles 加 deleted_at 軟刪欄位
-- 2. gdpr_requests 追蹤匯出 / 刪除請求
-- 3. is_user_deleted() helper 供 RLS / middleware 用
--
-- 注意：
-- - 軟刪後使用者立刻無法登入（middleware 檢查 deleted_at）
-- - 7 天後 admin 可在 /admin/gdpr 手動硬刪（呼叫 delete_user_account RPC）
-- - 沒做自動 cron job 硬刪、避免誤刪、保留 admin 主動 review

-- 1. profiles 軟刪欄位
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. GDPR 請求表
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type  TEXT NOT NULL CHECK (request_type IN ('export', 'delete')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'cancelled', 'hard_deleted')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  scheduled_hard_delete_at TIMESTAMPTZ,  -- 軟刪後預計可硬刪的時間（軟刪 + 7 天）
  meta          JSONB,                    -- export: { row_counts }, delete: { reason? }
  processed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gdpr_user        ON public.gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_status      ON public.gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_type_status ON public.gdpr_requests(request_type, status);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- 使用者可看 / 建立自己的請求
DROP POLICY IF EXISTS gdpr_own_select ON public.gdpr_requests;
CREATE POLICY gdpr_own_select ON public.gdpr_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS gdpr_own_insert ON public.gdpr_requests;
CREATE POLICY gdpr_own_insert ON public.gdpr_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- admin 可看 / 改全部
DROP POLICY IF EXISTS gdpr_admin_all ON public.gdpr_requests;
CREATE POLICY gdpr_admin_all ON public.gdpr_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. helper：檢查使用者是否已軟刪
CREATE OR REPLACE FUNCTION public.is_user_deleted(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT COALESCE(deleted_at IS NOT NULL, false)
  FROM public.profiles
  WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_deleted(UUID) TO authenticated, anon, service_role;

-- 4. 軟刪 RPC（user 自助）
CREATE OR REPLACE FUNCTION public.gdpr_soft_delete_self()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 標記軟刪
  UPDATE public.profiles
  SET deleted_at = NOW()
  WHERE id = v_user_id AND deleted_at IS NULL;

  -- 建立刪除請求（admin 7 天後可硬刪）
  INSERT INTO public.gdpr_requests (user_id, request_type, status, scheduled_hard_delete_at)
  VALUES (v_user_id, 'delete', 'pending', NOW() + INTERVAL '7 days')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gdpr_soft_delete_self() TO authenticated;

-- 5. 取消軟刪（user 自助、僅 7 天內可救回）
CREATE OR REPLACE FUNCTION public.gdpr_cancel_delete_self()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.profiles
  SET deleted_at = NULL
  WHERE id = v_user_id AND deleted_at IS NOT NULL;

  UPDATE public.gdpr_requests
  SET status = 'cancelled', completed_at = NOW()
  WHERE user_id = v_user_id
    AND request_type = 'delete'
    AND status = 'pending';

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gdpr_cancel_delete_self() TO authenticated;
