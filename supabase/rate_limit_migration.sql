-- P4-14 API rate limit per user
-- 滑動視窗：每 user + 路徑、每 N 秒最多 M 次。
-- 透過 RPC check_rate_limit(user_id, scope, limit_count, window_seconds) 回 boolean。

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope      TEXT NOT NULL,                          -- e.g. 'ai:chat' / 'forum:thread:create' / 'blog:post'
  hit_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_hits_user_scope_time
  ON public.rate_limit_hits(user_id, scope, hit_at DESC);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rate_hits_admin_select ON public.rate_limit_hits;
CREATE POLICY rate_hits_admin_select ON public.rate_limit_hits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 規則表：admin 可在 /admin/rate-limits 設定每 scope 的上限
CREATE TABLE IF NOT EXISTS public.rate_limit_rules (
  scope          TEXT PRIMARY KEY,
  limit_count    INTEGER NOT NULL CHECK (limit_count > 0),
  window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
  enabled        BOOLEAN NOT NULL DEFAULT true,
  note           TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rate_rules_admin_all ON public.rate_limit_rules;
CREATE POLICY rate_rules_admin_all ON public.rate_limit_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 預設規則（保守值、admin 可在 UI 調整）
INSERT INTO public.rate_limit_rules (scope, limit_count, window_seconds, note) VALUES
  ('ai:chat',              30,  60,  'AI 對話每分鐘 30 次'),
  ('ai:tutor',             20,  60,  '綠寶導師每分鐘 20 次'),
  ('forum:thread:create',   5, 600,  '論壇發文每 10 分鐘 5 篇'),
  ('forum:reply:create',   30, 600,  '論壇回覆每 10 分鐘 30 則'),
  ('blog:article:create',   5, 3600, '部落格文章每小時 5 篇'),
  ('blog:comment:create',  20,  300, '部落格留言每 5 分鐘 20 則')
ON CONFLICT (scope) DO NOTHING;

-- check_rate_limit RPC：true = 通過、false = 超限
-- 副作用：插入一筆 hit（如果通過）
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_scope TEXT
) RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rule RECORD;
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
BEGIN
  -- 沒規則 → 通過、不限流
  SELECT * INTO v_rule FROM public.rate_limit_rules WHERE scope = p_scope AND enabled = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 9999::integer, 0::integer;
    RETURN;
  END IF;

  -- 沒 user_id → 通過（匿名請求單純不限）
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT true, v_rule.limit_count, 0::integer;
    RETURN;
  END IF;

  -- 計算視窗內次數
  SELECT COUNT(*), MIN(hit_at) INTO v_count, v_oldest
  FROM public.rate_limit_hits
  WHERE user_id = p_user_id
    AND scope = p_scope
    AND hit_at > NOW() - (v_rule.window_seconds || ' seconds')::INTERVAL;

  IF v_count >= v_rule.limit_count THEN
    -- 超限、不寫 hit
    RETURN QUERY SELECT
      false,
      0::integer,
      GREATEST(
        1,
        EXTRACT(EPOCH FROM (v_oldest + (v_rule.window_seconds || ' seconds')::INTERVAL - NOW()))::integer
      );
    RETURN;
  END IF;

  -- 通過、寫 hit
  INSERT INTO public.rate_limit_hits (user_id, scope) VALUES (p_user_id, p_scope);

  RETURN QUERY SELECT
    true,
    (v_rule.limit_count - v_count - 1)::integer,
    0::integer;
END;
$$;

-- 清理 job：刪除超過 24 小時的 hit（保留窗口外的記錄沒意義）
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_hits()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limit_hits WHERE hit_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_hits() TO service_role;
