-- B6: achievements 是公開徽章目錄（25 筆、無 user_id），RLS 開著但 0 policy = 全 deny。
-- 補一條公開 SELECT；寫入維持 deny-all（只有 service-role admin 繞過 RLS 能改）。
-- 每位學員看得到所有徽章定義（含未解鎖的、當作目標）。user_achievements（誰解了哪個）是另一張表、各自的 policy 管。

drop policy if exists "achievements public read" on public.achievements;
create policy "achievements public read"
  on public.achievements
  for select
  using (true);
