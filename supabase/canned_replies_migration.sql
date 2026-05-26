-- 客服罐頭訊息（saved replies / canned responses）
-- admin 在 CRM 回覆 ticket 時一鍵插入常用模板、省打字

CREATE TABLE IF NOT EXISTS public.canned_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- null = 全 admin 共用
  title text NOT NULL,                  -- 「歡迎信」「請提供訂單編號」
  body text NOT NULL,                   -- 實際內容、可含 {{username}} {{ticket_id}} 變數
  category text,                        -- greeting / order / tech / closing / etc
  shortcut text,                        -- 例 'greet' 'thx'、admin 可用快捷鍵插入
  use_count int NOT NULL DEFAULT 0,     -- 統計用、最常用排前面
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canned_owner ON public.canned_replies (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_canned_shortcut ON public.canned_replies (shortcut) WHERE shortcut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canned_use_count ON public.canned_replies (use_count DESC);

ALTER TABLE public.canned_replies ENABLE ROW LEVEL SECURITY;

-- admin 全讀（共用 + 自己的）
DROP POLICY IF EXISTS canned_admin_read ON public.canned_replies;
CREATE POLICY canned_admin_read ON public.canned_replies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'assistant')));

-- admin 寫自己的、共用要 owner role（或允許所有 admin 建共用、後台 review）
DROP POLICY IF EXISTS canned_admin_insert ON public.canned_replies;
CREATE POLICY canned_admin_insert ON public.canned_replies FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'assistant'))
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS canned_admin_update ON public.canned_replies;
CREATE POLICY canned_admin_update ON public.canned_replies FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS canned_admin_delete ON public.canned_replies;
CREATE POLICY canned_admin_delete ON public.canned_replies FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 初始化幾條共用罐頭範本
INSERT INTO public.canned_replies (owner_user_id, title, body, category, shortcut) VALUES
  (NULL, '歡迎 / 收到', '您好 {{username}}、感謝您透過 AI 島聯繫客服 👋\n\n我們已收到您的訊息、會盡快查清楚回覆您～', 'greeting', 'hi'),
  (NULL, '請提供訂單編號', '麻煩請提供您的訂單編號（格式 #xxxxxxxx）、我幫您查一下狀況～', 'order', 'order-id'),
  (NULL, '轉技術部門', '這個問題已轉給技術部門、預計 24 小時內回覆您。造成不便、感謝您的耐心 🙏', 'tech', 'tech'),
  (NULL, '已解決 / 結案', '問題已處理完畢、麻煩您驗證一下是否正常 ✅\n\n如還有其他需要、隨時 LINE 給我們、結案這條 ticket 囉～', 'closing', 'done'),
  (NULL, '請看常見問答', '這個問題在我們的 FAQ 有完整說明：https://ai-island-web.snowrealm.pet/help\n\n如果還是有疑問、再回我們～', 'tech', 'faq'),
  (NULL, '退款處理中', '已為您申請退款、約 3-5 個工作天會回到您原付款方式。退款完成會再通知您 💰', 'order', 'refund')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.canned_replies IS '客服罐頭訊息（saved replies）、admin 一鍵插入回覆';
COMMENT ON COLUMN public.canned_replies.owner_user_id IS 'null = 全 admin 共用、有值 = 該 admin 私有';
COMMENT ON COLUMN public.canned_replies.body IS '支援變數：{{username}} {{ticket_id}} {{ticket_subject}}';
