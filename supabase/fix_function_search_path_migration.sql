-- 修 Supabase 警告：function_search_path_mutable
-- 只改「你自己的」函式（排除 pgvector 等 extension 函式 — 那些是套件內建、不該動）。
-- 設 search_path = public（pg_catalog 一律隱含優先）→ 清掉警告、不改行為。
-- 冪等：再跑一次只會處理還沒設的；可安全重複執行。
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT (p.oid::regprocedure)::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg WHERE cfg LIKE 'search_path=%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'  -- 排除 extension 函式
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- 驗證（應回 0）：
-- SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public'
--   AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%')
--   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e');
