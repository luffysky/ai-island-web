-- 機會島 V2：機會訂閱。使用者存一組條件（關鍵字/分類/免費/最低獎金），有「新符合的機會」就推播（in-app + LINE）。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/opportunity_subscriptions_migration.sql

CREATE TABLE IF NOT EXISTS public.opportunity_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,                              -- 顯示名（自動由條件組）
  keywords text,                           -- 關鍵字（單字串，比對 name/category/organizer）
  categories text[] NOT NULL DEFAULT '{}', -- 分類（OR：符合任一）
  free_only boolean NOT NULL DEFAULT false,
  min_prize numeric,                       -- 最低獎金（prize_amount >=）
  enabled boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz NOT NULL DEFAULT now(),  -- cron 掃「比這新且符合」的機會才算新符合
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opp_subs_user ON public.opportunity_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_opp_subs_enabled ON public.opportunity_subscriptions(enabled);

ALTER TABLE public.opportunity_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunity_subscriptions_own ON public.opportunity_subscriptions;
CREATE POLICY opportunity_subscriptions_own ON public.opportunity_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
