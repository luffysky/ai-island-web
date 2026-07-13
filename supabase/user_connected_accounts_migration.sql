-- 使用者外部帳號連結中心：每人可連結多個平台、每平台可綁「多個」帳號（如多個 IG）。
-- token 一律加密存（AES-256-GCM，跟 user_api_keys 同一套）。冪等、加法。
-- 跑法：node scripts/run-sql.mjs supabase/user_connected_accounts_migration.sql

CREATE TABLE IF NOT EXISTS public.user_connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,                 -- telegram/discord/youtube/instagram/threads/tiktok/gmail/gcalendar/github/x
  external_id text,                       -- 平台的帳號 id / handle（用來去重、多帳號區分）
  display_name text,                      -- 顯示名（@handle 或暱稱）
  access_token_encrypted text,            -- OAuth 或手動貼的 token（加密；可空）
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text,
  connect_method text NOT NULL DEFAULT 'manual',  -- manual / oauth
  status text NOT NULL DEFAULT 'connected',       -- connected / expired / revoked
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uca_user ON public.user_connected_accounts(user_id, provider);
-- 同一使用者、同平台、同一個外部帳號不重複綁（但不同 external_id 可多開）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_uca_account ON public.user_connected_accounts(user_id, provider, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.user_connected_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_connected_accounts_own ON public.user_connected_accounts;
CREATE POLICY user_connected_accounts_own ON public.user_connected_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
