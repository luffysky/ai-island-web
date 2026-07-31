-- 2.6.1 自主任務規劃：排程員工可「自己決定今天做什麼」。autonomous=true 時 goal 欄改當「職責/使命」描述，
-- 每次觸發由 planAutonomousGoal 依職責+近期歷史+記憶決定一個具體任務再跑。
alter table public.agent_schedules add column if not exists autonomous boolean not null default false;
