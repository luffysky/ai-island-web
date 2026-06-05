-- #6 回饋迴路：學員對 AI 回答按讚/倒讚 → 收集（尤其爛 case）→ 之後改 prompt / 加 few-shot
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id uuid,
  rating          text NOT NULL CHECK (rating IN ('up', 'down')),
  question        text,
  answer          text,
  model           text,
  persona         text,
  note            text,         -- 倒讚可選填「哪裡不對」
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_feedback_rating_idx ON public.ai_feedback (rating, created_at DESC);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
-- 寫入只走後端 service_role（API route 帶 user_id）；client 不能直接塞
DROP POLICY IF EXISTS ai_feedback_no_client_write ON public.ai_feedback;
CREATE POLICY ai_feedback_no_client_write ON public.ai_feedback FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
