-- 每日測驗「是否通過」= 正確率 >= 60%（計算欄、bot 統計用、之前漏建）
alter table public.daily_quiz_attempts
  add column if not exists pass boolean
  generated always as (total > 0 and (correct::numeric / total) >= 0.6) stored;
