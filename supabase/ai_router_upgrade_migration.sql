-- ========================================================================
-- 智慧模型路由升級（additive、100% 向後相容）
--   1) ai_usage_models.candidates：每個用途的「有序候選模型陣列」
--      （主模型 + 備援）。空/NULL → 沿用單一 model_name（舊行為不變）。
--      格式：JSONB 陣列，元素可為 "model_name" 字串、或
--            { "model": "gpt-4o-mini", "role": "escalate" } 物件。
--   2) ai_feedback.usage_key / meta：回饋迴路補記用途 + 任意 meta。
-- ========================================================================

-- 1) 用途候選模型鏈（有序）
ALTER TABLE public.ai_usage_models
  ADD COLUMN IF NOT EXISTS candidates JSONB;
COMMENT ON COLUMN public.ai_usage_models.candidates IS
  '有序候選模型鏈（主模型+備援），JSONB 陣列。空→沿用 model_name。見 src/lib/ai-usage-models.ts';

-- 2) ai_feedback 補欄位（表已存在，見 ai_feedback_migration.sql）
ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS usage_key TEXT;
ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS meta JSONB;
COMMENT ON COLUMN public.ai_feedback.usage_key IS '這則回饋對應的 AI 用途（ai_usage_models.usage_key）';
COMMENT ON COLUMN public.ai_feedback.meta IS '任意結構化 meta（例：fellBack / latencyMs / candidateChain）';

CREATE INDEX IF NOT EXISTS ai_feedback_usage_key_idx
  ON public.ai_feedback (usage_key, created_at DESC);
