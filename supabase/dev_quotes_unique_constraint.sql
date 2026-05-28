-- 加 quote UNIQUE constraint、強制 DB 端不允許重複
-- oneshot 寫入時用 ON CONFLICT (quote) DO NOTHING 安靜跳過、不再依賴最後 DELETE 去重

-- 先確保現有資料沒重複（如果有殘留會 fail、要先手動清）
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT quote FROM public.dev_quotes GROUP BY quote HAVING COUNT(*) > 1
  ) t;
  IF dup_count > 0 THEN
    -- 自動清掉、保留 MIN(id) 那一筆
    DELETE FROM public.dev_quotes
     WHERE id NOT IN (SELECT MIN(id) FROM public.dev_quotes GROUP BY quote);
    RAISE NOTICE '清掉 % 組重複 quote', dup_count;
  END IF;
END $$;

-- 加 UNIQUE constraint
ALTER TABLE public.dev_quotes
  ADD CONSTRAINT dev_quotes_quote_unique UNIQUE (quote);
