-- 對外公開 API key（user 自己生、自己用）
-- /api/v1/chat 等 endpoint 用 key 認證、計 quota
-- 跟 user_api_keys（學員用自己 OpenAI/Anthropic key 走 BYOK）不同：這個是 AI 島自己的 API key

CREATE TABLE IF NOT EXISTS public.api_keys_v1 (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,              -- 例 'My App' / 'Test key'
  key_prefix        TEXT NOT NULL,              -- 'aii_xxxx'（前綴給 user 識別）
  key_hash          TEXT NOT NULL UNIQUE,       -- SHA256 全 key、認證用
  quota_per_month   INTEGER NOT NULL DEFAULT 100,  -- 預設 free 100 calls / month
  used_this_month   INTEGER NOT NULL DEFAULT 0,
  quota_reset_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active            BOOLEAN NOT NULL DEFAULT true,
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_v1_user ON public.api_keys_v1(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_v1_active ON public.api_keys_v1(active);

ALTER TABLE public.api_keys_v1 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_v1_own ON public.api_keys_v1;
CREATE POLICY api_keys_v1_own ON public.api_keys_v1
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
