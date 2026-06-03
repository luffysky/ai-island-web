-- 個資外洩通報機制
-- 依個資法、發現外洩 72 小時內要通報主管機關 + 通知當事人

-- 1. 外洩事件紀錄表
CREATE TABLE IF NOT EXISTS public.breach_incidents (
  id BIGSERIAL PRIMARY KEY,

  -- 事件基本資訊
  discovered_at TIMESTAMPTZ NOT NULL,            -- 發現時間（72 小時計時起點）
  occurred_at TIMESTAMPTZ,                       -- 實際發生時間（如可確定）
  incident_type TEXT NOT NULL,                   -- 'unauthorized_access' / 'data_loss' / 'system_breach' / 'leak' / 'other'
  severity TEXT NOT NULL DEFAULT 'medium',       -- 'low' / 'medium' / 'high' / 'critical'

  -- 影響範圍
  affected_user_count INT,
  affected_data_types TEXT[],                    -- ['email', 'password_hash', 'name', 'ai_history', 'payment']
  affected_user_ids UUID[],                      -- 受影響的具體 user IDs

  -- 事件詳情
  description TEXT NOT NULL,                     -- 事件描述
  root_cause TEXT,                               -- 原因分析
  containment_actions TEXT,                      -- 已採取的圍堵措施
  remediation_plan TEXT,                         -- 補救計畫

  -- 通報狀態
  reported_to_authority BOOLEAN DEFAULT false,
  authority_reported_at TIMESTAMPTZ,
  authority_reference TEXT,                      -- 政府單位給的案號

  users_notified BOOLEAN DEFAULT false,
  users_notified_at TIMESTAMPTZ,
  notification_method TEXT,                      -- 'email' / 'in_app' / 'sms' / 'public_announcement'

  -- 經辦
  reporter_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'investigating',  -- 'investigating' / 'contained' / 'resolved' / 'reported'
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_incidents_status ON public.breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_discovered_at ON public.breach_incidents(discovered_at DESC);

ALTER TABLE public.breach_incidents
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reported_to_authority BOOLEAN DEFAULT false;

ALTER TABLE public.breach_incidents ENABLE ROW LEVEL SECURITY;

-- 只有 admin 看得到
DROP POLICY IF EXISTS "breach_incidents_admin_all" ON public.breach_incidents;
CREATE POLICY "breach_incidents_admin_all"
  ON public.breach_incidents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- 2. 通報時程提醒：> 48 小時未通報的事件
CREATE OR REPLACE VIEW public.breach_incidents_urgent AS
SELECT
  *,
  EXTRACT(EPOCH FROM (NOW() - discovered_at)) / 3600 AS hours_since_discovered,
  CASE
    WHEN reported_to_authority THEN 'reported'
    WHEN EXTRACT(EPOCH FROM (NOW() - discovered_at)) / 3600 >= 72 THEN 'overdue'
    WHEN EXTRACT(EPOCH FROM (NOW() - discovered_at)) / 3600 >= 48 THEN 'urgent'
    ELSE 'ontime'
  END AS time_status
FROM public.breach_incidents
WHERE status != 'resolved'
ORDER BY discovered_at ASC;


-- 3. Email 訂閱與退訂表（給 CAN-SPAM 退訂連結用）
CREATE TABLE IF NOT EXISTS public.email_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,

  -- 各類型訂閱開關
  newsletter BOOLEAN DEFAULT true,               -- 行銷電子報
  product_updates BOOLEAN DEFAULT true,          -- 產品更新通知
  course_announcements BOOLEAN DEFAULT true,     -- 課程上線
  weekly_digest BOOLEAN DEFAULT false,           -- 週報

  -- 系統通知（不可關）
  transactional BOOLEAN DEFAULT true,            -- 訂單、密碼重設等

  -- 退訂 token（不需登入就能退訂）
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'base64'),

  -- 統計
  last_email_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_subs_email ON public.email_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_email_subs_token ON public.email_subscriptions(unsubscribe_token);

ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

-- 用戶可以看自己的、改自己的
DROP POLICY IF EXISTS "email_subs_own" ON public.email_subscriptions;
CREATE POLICY "email_subs_own" ON public.email_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "email_subs_own_update" ON public.email_subscriptions;
CREATE POLICY "email_subs_own_update" ON public.email_subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin 看全部
DROP POLICY IF EXISTS "email_subs_admin" ON public.email_subscriptions;
CREATE POLICY "email_subs_admin" ON public.email_subscriptions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 4. 自動建 email subscription（註冊後）
CREATE OR REPLACE FUNCTION public.create_email_subscription_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_subscriptions (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_email_subscription_on_signup();
