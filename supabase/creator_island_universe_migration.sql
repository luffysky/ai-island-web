-- 🌌 碎片宇宙（創作洞察報告）快取欄位
-- 報告是 AI 從使用者累積的碎片/作品歸納出的洞察，算一次存起來（重生成才覆蓋）。
-- 掛在 ci_creator_stats（已 per-user、有 RLS ci_stats_read=本人可讀），不另開表。
ALTER TABLE public.ci_creator_stats
  ADD COLUMN IF NOT EXISTS universe      JSONB,
  ADD COLUMN IF NOT EXISTS universe_at   TIMESTAMPTZ;
