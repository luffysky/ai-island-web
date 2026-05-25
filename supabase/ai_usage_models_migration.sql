-- ========================================================================
-- AI 用途 ↔ 模型對應表
-- 用途：每個 AI 場景 (line_admin / line_user / nami_challenge_gen / ai_tutor / ...)
--   可以獨立指定用哪個 model。
-- 沒設 → fallback 到 ai_models.is_default = true 那筆。
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_models (
  usage_key   TEXT PRIMARY KEY,                          -- 'line_admin' / 'line_user' / etc
  description TEXT,                                      -- 給 admin UI 顯示
  model_name  TEXT NOT NULL,  -- 對應 ai_models.model_name、沒做 FK 因為 model_name 沒 unique 約束
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.ai_usage_models IS 'AI 用途 → 模型對應、每個場景可指定不同 model';
COMMENT ON COLUMN public.ai_usage_models.usage_key IS '用途識別、code 內 hardcoded、見 src/lib/ai-usage-models.ts';

ALTER TABLE public.ai_usage_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_models_admin_all ON public.ai_usage_models;
CREATE POLICY ai_usage_models_admin_all ON public.ai_usage_models
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

-- 預設值（不會覆蓋既有）
INSERT INTO public.ai_usage_models (usage_key, description, model_name)
SELECT v.usage_key, v.description, m.model_name
FROM (
  VALUES
    ('line_admin',           'LINE admin bot 對話 / tool use'),
    ('line_user',            'LINE user bot 學員導師'),
    ('ai_tutor',             '站內 AI 學員導師 (聊天視窗)'),
    ('nami_challenge_gen',   'Nami 出題 AI'),
    ('nami_help',            'Nami Playground 問 AI'),
    ('content_moderation',   '留言 / 論壇審核'),
    ('blog_writer',          '部落格 AI 撰文助手'),
    ('chapter_quiz_gen',     '章節 quiz 自動出題'),
    ('seo_meta_gen',         'SEO meta 自動生成'),
    ('admin_assistant',      '後台一般 AI 助理')
) AS v(usage_key, description)
CROSS JOIN LATERAL (
  SELECT model_name FROM public.ai_models WHERE is_active = true
  ORDER BY (is_default = true) DESC, created_at ASC LIMIT 1
) m
ON CONFLICT (usage_key) DO NOTHING;
