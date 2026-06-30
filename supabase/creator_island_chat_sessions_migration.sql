-- 綠寶（創作島嶼島內對話）歷史：一個 session 一列、訊息存 jsonb。
CREATE TABLE IF NOT EXISTS public.ci_chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  title         TEXT NOT NULL DEFAULT '新對話',
  messages      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_chat_sessions_user ON public.ci_chat_sessions(workspace_id, user_id, updated_at DESC);

ALTER TABLE public.ci_chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_chat_sessions_read ON public.ci_chat_sessions;
CREATE POLICY ci_chat_sessions_read ON public.ci_chat_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.ci_is_workspace_member(workspace_id));
