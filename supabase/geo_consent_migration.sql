-- 精準位置同意（用戶 opt-in）
-- 只存大致縣市、不存原始 GPS、保護隱私

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS geo_country     TEXT,
  ADD COLUMN IF NOT EXISTS geo_city        TEXT,
  ADD COLUMN IF NOT EXISTS geo_consent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geo_revoked_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_geo_city ON public.profiles(geo_city) WHERE geo_city IS NOT NULL;
