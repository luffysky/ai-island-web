-- 收緊 3 個遙測表的 INSERT policy（清 rls_policy_always_true 警告）
-- 三者都改成由後端 service_role 寫入（ab_* 本來就是；web_vitals route 已改用 admin client）。
-- WITH CHECK(false)：service_role bypass RLS 仍可寫、但 anon/authenticated client 無法直接偽造塞資料。
ALTER POLICY ab_assign_insert_any  ON public.ab_assignments WITH CHECK (false);
ALTER POLICY ab_events_insert_any  ON public.ab_events      WITH CHECK (false);
ALTER POLICY web_vitals_insert_any ON public.web_vitals     WITH CHECK (false);
