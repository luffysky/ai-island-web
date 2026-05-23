-- P4-10 錯誤日誌表（運維剛需）
-- 任何 API route / server action 失敗時呼叫 logError() 寫入。
-- admin 可在 /admin/errors 查看、過濾、解決。

CREATE TABLE IF NOT EXISTS public.error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level         TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('debug','info','warn','error','fatal')),
  source        TEXT NOT NULL,                       -- e.g. 'api:/api/ai/chat' / 'route:/me/blog/edit'
  message       TEXT NOT NULL,                       -- 1-line 主要訊息
  stack         TEXT,                                 -- 完整 stack trace（選）
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_path  TEXT,
  request_method TEXT,
  status_code   INTEGER,                              -- 4xx / 5xx
  user_agent    TEXT,
  ip            TEXT,                                 -- 已 anonymize 過的 hash 即可
  extra         JSONB,                                -- 自訂 context
  resolved      BOOLEAN NOT NULL DEFAULT false,
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON public.error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level    ON public.error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source   ON public.error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_logs_user     ON public.error_logs(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- 只有 admin 可看 / 改、其他人完全鎖死
DROP POLICY IF EXISTS error_logs_admin_all ON public.error_logs;
CREATE POLICY error_logs_admin_all ON public.error_logs
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

-- service_role 透過 supabase-admin client 跳過 RLS、可直接 insert
