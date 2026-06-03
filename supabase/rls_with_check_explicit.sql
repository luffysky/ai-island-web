-- B2: 把所有「FOR ALL」policy 的 WITH CHECK 明確化 = USING。
--
-- 背景：Postgres 對 ALL/UPDATE policy 若省略 WITH CHECK、會「隱式」用 USING 當 WITH CHECK，
-- 所以寫入其實一直有受約束（非漏洞）。但明確寫出來比較不會被誤讀、也通過稽核。
--
-- 這個 DO 區塊是 idempotent：只挑 with_check IS NULL 的 ALL policy、把它的 USING 鏡射成 WITH CHECK。
-- 跑過一次後再跑就 0 筆符合、no-op。涵蓋 kanban x3 / external_resources / user_ai_memory /
-- user_daily_goals 等散落在各 migration 的 admin policy。

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pp.policyname, pp.tablename,
           pg_get_expr(po.polqual, po.polrelid) AS qual
    FROM pg_policies pp
    JOIN pg_policy po ON po.polname = pp.policyname
    JOIN pg_class cl ON cl.oid = po.polrelid AND cl.relname = pp.tablename
    WHERE pp.schemaname = 'public'
      AND pp.cmd = 'ALL'
      AND pp.with_check IS NULL
      AND po.polqual IS NOT NULL
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I WITH CHECK (%s)',
      r.policyname, r.tablename, r.qual
    );
    RAISE NOTICE 'WITH CHECK 補上: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;
