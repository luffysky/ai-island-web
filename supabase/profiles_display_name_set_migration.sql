-- 是否已自選顯示名稱。現有使用者一律 true（不打擾）；
-- 之後 Google/OAuth 首次登入建檔時設 false → 導去 onboarding 讓本人填。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name_set BOOLEAN NOT NULL DEFAULT true;
