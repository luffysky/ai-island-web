-- 統一通知中心：使用者可分類控制哪些事件推 LINE。加 4 個 boolean（預設 true=開，向後相容）。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/user_line_prefs_migration.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_pref_deadlines boolean NOT NULL DEFAULT true;      -- 機會截止提醒
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_pref_subscriptions boolean NOT NULL DEFAULT true;  -- 機會訂閱符合
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_pref_agent boolean NOT NULL DEFAULT true;          -- 分身島任務完成/需批准
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_pref_learning boolean NOT NULL DEFAULT true;       -- 完課/成就/連勝
