-- 收緊 SECURITY DEFINER 函式的 EXECUTE 權限
-- 清 Supabase 警告：anon/authenticated_security_definer_function_executable
--
-- 安全性說明：
--  - service_role（伺服器 admin client、會 bypass RLS）一律「保留」EXECUTE → 後端呼叫不受影響。
--  - 純觸發器函式以 definer 身分被觸發、不需要任何 EXECUTE grant → 收回不影響觸發。
--  - SERVER_ONLY：只由後端 admin.rpc 呼叫 → 收回 anon + authenticated（警告清掉）。
--  - AUTH_KEEP：登入者 supabase.rpc / 瀏覽器 / RLS helper → 只收回 anon、保留 authenticated（authenticated_* 警告刻意保留、本來就該登入才能用）。
--  - 未列入者（inc_blog_view / inc_forum_view）：匿名訪客也會增 view、保持原狀。

DO $$
DECLARE
  r record;
  nm text;
  server_only text[] := ARRAY[
    'handle_new_user','create_email_subscription_on_signup','sync_profile_email',
    'update_user_on_lesson','rls_auto_enable',
    'consume_ai_quota','consume_ai_action','consume_ai_token_cap',
    'check_ai_action','check_rate_limit','cleanup_rate_limit_hits',
    'inc_system_key_usage','upsert_ai_usage','bump_cache_hit',
    'analytics_increment_session_page_count'
  ];
  auth_keep text[] := ARRAY[
    'claim_quest_reward','ensure_daily_quests','evolve_pet','increment_quest_progress',
    'gdpr_soft_delete_self','gdpr_cancel_delete_self','do_checkin','get_checkin_status',
    'is_note_collaborator','is_note_editor'
  ];
BEGIN
  FOREACH nm IN ARRAY server_only LOOP
    FOR r IN SELECT (oid::regprocedure)::text AS s FROM pg_proc
             WHERE proname = nm AND pronamespace = 'public'::regnamespace LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.s);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.s);
    END LOOP;
  END LOOP;

  FOREACH nm IN ARRAY auth_keep LOOP
    FOR r IN SELECT (oid::regprocedure)::text AS s FROM pg_proc
             WHERE proname = nm AND pronamespace = 'public'::regnamespace LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.s);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role, authenticated', r.s);
    END LOOP;
  END LOOP;
END $$;

-- notifications：原本 INSERT policy with_check(true) → 任何角色可偽造通知。
-- 改成 false：service_role（後端、bypass RLS）仍可寫、但 client 無法偽造他人通知。
ALTER POLICY notif_service_insert ON public.notifications WITH CHECK (false);

-- 驗證（套用後跑、看還剩幾個自有 SECURITY DEFINER 函式可被 anon/authenticated 執行）：
-- SELECT
--   count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE'))          AS anon_n,
--   count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')) AS auth_n
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.prosecdef
--   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e');
