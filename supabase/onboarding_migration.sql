-- 新手友善 onboarding 進度（A: tour、B: wizard、C: chapters）
-- 林董：「新手友善 A+B+C 都做」
-- profiles 加 4 個欄位、追蹤新手三件套各自狀態

alter table profiles add column if not exists onboarding_wizard_completed_at timestamptz;
alter table profiles add column if not exists onboarding_tour_completed_at timestamptz;
alter table profiles add column if not exists onboarding_pet_picked text;          -- 'hamster' / 'cat' / 'dog' / 'rabbit'
alter table profiles add column if not exists onboarding_starting_chapter int;     -- wizard 推薦的第一章 id

-- 公開 / 已存在 RLS 即可、不另外加 policy（這幾個欄位用既有 profile policy）
