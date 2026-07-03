-- 每週 AI 學習教練報告
-- computeCoachReport(userId) 產出的 JSON 快取（每人每週一份）
-- report jsonb 形如 { thisWeek, stuckOn, nextSteps: string[] }
create table if not exists public.learning_coach_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  report jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists learning_coach_reports_user_idx
  on public.learning_coach_reports (user_id, week_start desc);

alter table public.learning_coach_reports enable row level security;

-- 學員只能讀自己的報告；寫入一律走 service-role（cron / on-demand API），故不開 anon write policy
drop policy if exists learning_coach_reports_select_own on public.learning_coach_reports;
create policy learning_coach_reports_select_own
  on public.learning_coach_reports for select
  using (auth.uid() = user_id);
