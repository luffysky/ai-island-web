-- 2026-07-22 — 機會島 §3.5 三表（承 todo）：
--   submission_tasks  : 使用者對某機會的「缺件 / 準備清單」逐項追蹤（我的機會 Dashboard）
--   user_portfolio    : 使用者作品 / 能力庫（結構化，供 AI 配對、能力圖譜）
--   opportunity_changes: 機會欄位變動歷史（截止 / 獎金 / 資格…版本比較）
-- 冪等（IF NOT EXISTS / CREATE OR REPLACE-style policy drop）、可重跑。

-- ── 1. submission_tasks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submission_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  title text NOT NULL,                         -- 例：「準備 3 分鐘 demo 影片」
  done boolean NOT NULL DEFAULT false,
  due_date date,                               -- 該項自訂截止（可空）
  sort_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_user_opp ON public.submission_tasks(user_id, opportunity_id, sort_index);

ALTER TABLE public.submission_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sub_tasks_own ON public.submission_tasks;
CREATE POLICY sub_tasks_own ON public.submission_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 2. user_portfolio ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'work',           -- work|skill|award|experience
  title text NOT NULL,
  description text,
  url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON public.user_portfolio(user_id, created_at DESC);

ALTER TABLE public.user_portfolio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portfolio_own ON public.user_portfolio;
CREATE POLICY portfolio_own ON public.user_portfolio
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. opportunity_changes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.opportunity_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  field text NOT NULL,                         -- deadline|prize|eligibility|status|name|...
  old_value text,
  new_value text,
  source text NOT NULL DEFAULT 'manual',       -- manual|radar|import
  detected_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opp_changes_opp ON public.opportunity_changes(opportunity_id, detected_at DESC);

-- 機會資料本身是公開的（opportunities 讀 policy = true）→ 變動歷史也公開讀；寫入僅走 service role（繞 RLS）。
ALTER TABLE public.opportunity_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opp_changes_read ON public.opportunity_changes;
CREATE POLICY opp_changes_read ON public.opportunity_changes FOR SELECT USING (true);
