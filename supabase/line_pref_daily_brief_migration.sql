-- 2026-08-06 §5.4：每日晨報獨立通知開關（原本掛在 line_pref_agent／分身島任務底下）。
-- 預設 true（沿用既有行為：綁 LINE 且沒關就會收到晨報）。冪等。
alter table public.profiles
  add column if not exists line_pref_daily_brief boolean not null default true;
