-- 修 Supabase 安全告警：Security Definer View（Critical）
-- 這 5 個 view 目前以「建立者（postgres）」權限執行、會繞過 RLS。
-- 改成 security_invoker = on → 改用「查詢者」的權限 + RLS 執行。
--
-- ⚠️ 套用後務必驗證（這幾個 view 有的是用「使用者 session」查的）：
--   1. /leaderboard            → leaderboard（跨使用者排行）：底層 profiles 需有「公開可讀」SELECT policy
--                                （站上有公開排行/論壇/部落格作者名 → 八成已有），否則排行榜會只剩自己。
--   2. /me/footprint           → user_weak_chapters（自己的弱章）：底層需允許使用者讀自己的列。
--   3. LINE 工具 / cron         → learning_state_summary / chapter_stats_summary / user_weak_chapters
--                                （都走 service_role、bypass RLS、不受影響）。
--   4. /admin/breach           → breach_incidents_urgent（admin 專用）。
--
-- PG15+ 支援直接 ALTER、不必重建 view。若某個 view 改了之後資料變少 = 底層缺對應 RLS policy，
-- 補一條 SELECT policy 即可（或先把該 view 這行註解掉、單獨處理）。

ALTER VIEW public.user_weak_chapters      SET (security_invoker = on);
ALTER VIEW public.learning_state_summary  SET (security_invoker = on);
ALTER VIEW public.chapter_stats_summary   SET (security_invoker = on);
ALTER VIEW public.breach_incidents_urgent SET (security_invoker = on);
ALTER VIEW public.leaderboard             SET (security_invoker = on);
