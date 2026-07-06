-- 完課排行榜 RPC（#136 排行榜多分類）
-- 跨使用者統計 lesson_progress 完成數。SECURITY DEFINER 繞過 lp_own（只讀自己）RLS 來做聚合，
-- 只回傳課數 + 公開的 profile 欄位（跟既有 leaderboard view 同等級的公開資料），不外洩哪一課。
create or replace function public.leaderboard_lessons(p_limit int default 100)
returns table (
  id uuid, username text, display_name text, avatar_url text,
  level int, xp int, streak_days int, lessons_done bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
         p.level, p.xp, p.streak_days, count(*)::bigint as lessons_done
  from public.lesson_progress lp
  join public.profiles p on p.id = lp.user_id
  where lp.completed is true
  group by p.id, p.username, p.display_name, p.avatar_url, p.level, p.xp, p.streak_days
  order by lessons_done desc, p.xp desc
  limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;

-- 只讀聚合、給前台排行榜用；REVOKE public 後明確授權（比照本輪函式權限收斂）。
revoke all on function public.leaderboard_lessons(int) from public;
grant execute on function public.leaderboard_lessons(int) to anon, authenticated, service_role;
