-- 修 Supabase linter：Public/Signed-in 可執行 SECURITY DEFINER 函式（權限提升漏洞）。
-- 這些「發幣 / 加 XP / 動錢包 / AI 額度」函式帶 p_user_id/p_amount 參數、只該由伺服器(service_role)呼叫；
-- 目前可經 /rest/v1/rpc/ 直接呼叫 → 使用者能自己刷幣/加分。
-- ⚠️ 關鍵：Postgres 函式預設把 EXECUTE 授予 PUBLIC，只 REVOKE anon/authenticated 無效（它們是 PUBLIC 成員）。
--    必須 REVOKE FROM PUBLIC，再明確 GRANT TO service_role（讓 app 伺服器端照常）。
-- 保留 client 直呼且自我識別(auth.uid())的：decrement_hearts / do_checkin / gdpr_* / is_note_* / 計數器 inc_*。

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'grant_zcoin(uuid, integer, text)',
    'award_z_coin(uuid, integer, text)',
    'increment_profile_xp(uuid, integer)',
    'ci_fruit_tx(uuid, integer, text, jsonb)',
    'ci_dust_tx(uuid, integer, text, jsonb)',
    'ci_debit_workspace_wallet(uuid, uuid, integer, text, jsonb)',
    'ci_purchase_listing(uuid, uuid)',
    'ci_transfer_workspace_owner(uuid, uuid)',
    'consume_ai_action(uuid, text, integer)',
    'consume_ai_token_cap(uuid, integer)',
    'check_ai_action(uuid, text, integer)',
    'claim_quest_reward(uuid)',
    'evolve_pet(uuid, integer)',
    'increment_quest_progress(text, integer)'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role;', fn);
  END LOOP;
END $$;

-- 補 search_path（本 session 新增的函式，避免 function_search_path_mutable 告警）
ALTER FUNCTION public.ci_memories_semantic(uuid, uuid, text, integer) SET search_path = public;
