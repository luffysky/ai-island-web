-- Agent 島 Phase C：長期記憶（跨對話記得使用者的事實/偏好/技能/專案/目標）。
-- 冪等、加法。跑法：貼進 Supabase SQL editor。
-- embedding 欄位先不加（pgvector 語意檢索留待後段）；先用「全部帶入 + 近期優先」即可跨對話記得。

CREATE TABLE IF NOT EXISTS public.agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,               -- 'fact' | 'preference' | 'skill' | 'project' | 'goal'
  key text NOT NULL,                -- 例 '受眾'、'常用平台'、'語氣偏好'
  value text NOT NULL,
  source_thread_id uuid,            -- 這條記憶從哪串對話學到（可空）
  confidence real DEFAULT 0.7,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, kind, key)        -- 同一 (kind,key) 只留一條、後寫覆蓋
);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON public.agent_memory(user_id, updated_at DESC);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_memory_own ON public.agent_memory;
CREATE POLICY agent_memory_own ON public.agent_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
