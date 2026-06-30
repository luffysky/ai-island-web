-- Email 驗證碼（註冊用）：寄 6 位數字碼到信箱、驗證通過才建帳號。
-- 寫入/讀取一律走 server service-role；RLS 開但無 policy = client 完全讀不到。
CREATE TABLE IF NOT EXISTS public.email_verifications (
  email       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,          -- sha256(code)、不存明碼
  purpose     TEXT NOT NULL DEFAULT 'signup',
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
-- 不建任何 policy → 只有 service-role 能存取。
