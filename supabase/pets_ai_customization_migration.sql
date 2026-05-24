-- pets 加 AI 客製化欄位
-- 讓使用者可以選模型 / 自訂個性提示詞 / 用自己的 API key

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS ai_model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_prompt text,
  ADD COLUMN IF NOT EXISTS use_byok boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pets.ai_model_id IS '使用者選的 AI 模型、null = 系統預設 (Haiku)';
COMMENT ON COLUMN public.pets.custom_prompt IS '使用者自訂的寵物個性提示詞、null = 用內建模板';
COMMENT ON COLUMN public.pets.use_byok IS 'true = 用使用者自己的 API key (user_api_keys 表)、false = 共池系統 key';
