-- 跨 channel AI 記憶表（Web / LINE / Telegram / Discord 共用同一份 memory）
-- 目的：每個 user 一條 row、cron 每天 AI 總結對話 → 寫進 summary / preferences / topics、
--      下次任何 channel 對話、buildTutorSystemPrompt 把這份 memory 塞進 prompt、
--      達到「越聊越懂你」、AI 風格隨 user 而異、不會「百人一面」。
--
-- 後端 admin only、user 不能直接讀寫（隱私 + 防 prompt injection）

CREATE TABLE IF NOT EXISTS public.user_ai_memory (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 一段話總結：「這個 user 最近聊了 X、卡在 Y、偏好 Z、講話 W 風格」
  summary TEXT,

  -- 偏好結構：{
  --   style: "casual"|"formal"|"sarcastic"|"poetic",
  --   tone_hints: ["愛諷刺", "喜歡哲學類比"],
  --   jargon_familiar: ["TypeScript", "React"],
  --   jargon_unfamiliar: ["pytorch", "BERT"],
  --   ...
  -- }
  preferences JSONB DEFAULT '{}'::jsonb,

  -- 關注主題：[{ topic: "認證", count: 12, last_at: "..." }, ...]
  topics JSONB DEFAULT '[]'::jsonb,

  -- 累計對話次數（用來決定要不要再總結、避免每天都重算）
  turn_count INTEGER NOT NULL DEFAULT 0,

  -- 上次 AI 總結的時間（cron 比較這個跟 NOW() 決定是否要更新）
  last_summarized_at TIMESTAMPTZ,

  -- meta
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_memory_last_summarized ON public.user_ai_memory(last_summarized_at);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_updated ON public.user_ai_memory(updated_at);

-- RLS：admin only、user 不直接讀寫
ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_ai_memory_admin_all" ON public.user_ai_memory;
CREATE POLICY "user_ai_memory_admin_all" ON public.user_ai_memory
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND (p.role IN ('admin','owner') OR p.is_owner = true)
    )
  );

-- 統計 trigger：updated_at 自動更新
CREATE OR REPLACE FUNCTION public.set_user_ai_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_ai_memory_updated ON public.user_ai_memory;
CREATE TRIGGER trg_user_ai_memory_updated
  BEFORE UPDATE ON public.user_ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_user_ai_memory_updated_at();
