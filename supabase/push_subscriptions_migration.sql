-- ============================================================
-- Web Push 訂閱表（push_subscriptions）
-- 每個 user 可有多個裝置/瀏覽器訂閱、以 endpoint 唯一
-- 2026-07-04
-- 冪等：IF NOT EXISTS / DROP POLICY IF EXISTS、重跑安全
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  ua          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

-- ── RLS：只能看/管自己的訂閱 ─────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_self_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_self_select" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_self_all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_self_all" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
