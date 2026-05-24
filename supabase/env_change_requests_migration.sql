-- env_change_requests
-- admin 申請新增 / 修改 ENV 變數的工單。
-- owner（林董）收到 LINE 通知、到 Zeabur dashboard 加完後在後台標完成。

CREATE TABLE IF NOT EXISTS public.env_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_username text,
  requested_by_display_name text,
  key_name text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by_username text,
  resolved_note text
);

CREATE INDEX IF NOT EXISTS idx_env_requests_status_created
  ON public.env_change_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_env_requests_requested_by
  ON public.env_change_requests (requested_by);

ALTER TABLE public.env_change_requests ENABLE ROW LEVEL SECURITY;

-- admin 全部可看（含已 resolved）
DROP POLICY IF EXISTS env_requests_admin_read ON public.env_change_requests;
CREATE POLICY env_requests_admin_read ON public.env_change_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin 可提交（必須是自己）
DROP POLICY IF EXISTS env_requests_admin_insert ON public.env_change_requests;
CREATE POLICY env_requests_admin_insert ON public.env_change_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin 可標完成 / 拒絕（任何 admin 都可、有 audit）
DROP POLICY IF EXISTS env_requests_admin_update ON public.env_change_requests;
CREATE POLICY env_requests_admin_update ON public.env_change_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.env_change_requests IS 'admin 申請新增 / 修改 ENV 變數的工單。owner 收到 LINE 通知後到 Zeabur 加完、在後台標完成。';
