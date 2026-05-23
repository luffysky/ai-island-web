-- 通知中心（Bell dropdown）
-- 在 Supabase SQL Editor 執行

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,           -- 'achievement' / 'level_up' / 'forum_reply' / 'comment' / 'follow' / 'system' / 'reward'
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_self_read ON public.notifications;
CREATE POLICY notif_self_read ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_update ON public.notifications;
CREATE POLICY notif_self_update ON public.notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_delete ON public.notifications;
CREATE POLICY notif_self_delete ON public.notifications FOR DELETE USING (user_id = auth.uid());
-- service role 可以寫入（系統發通知）
DROP POLICY IF EXISTS notif_service_insert ON public.notifications;
CREATE POLICY notif_service_insert ON public.notifications FOR INSERT WITH CHECK (true);
