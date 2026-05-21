-- ============================================================
-- AI 無限額度特權
-- 移植自 Insight 的 platform_unlimited 機制
-- 總後台可開關「指定帳號」免費無額度使用 AI
-- 預設關閉（一般使用者受額度限制）
-- ============================================================

-- profiles 加特權欄位
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_unlimited       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_unlimited_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_unlimited_by    UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.profiles.ai_unlimited IS 'AI 無限額度特權：true = 免費無額度限制使用 AI';

-- 查詢索引（檢查特權時用）
CREATE INDEX IF NOT EXISTS idx_profiles_ai_unlimited
  ON public.profiles(ai_unlimited) WHERE ai_unlimited = true;
