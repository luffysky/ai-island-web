-- ============================================
-- AI 島 後台擴充 schema（ERP + CRM）
-- 跑這個 migration 加入後台完整功能
-- 在 Supabase Dashboard → SQL Editor 執行
-- ============================================

-- =========== ERP：訂單 ===========
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_no TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL,  -- 'subscription' | 'course' | 'zcoin' | 'merchandise'
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL,  -- TWD
  currency TEXT DEFAULT 'TWD',
  status TEXT DEFAULT 'pending',  -- 'pending' | 'paid' | 'refunded' | 'cancelled' | 'failed'
  payment_method TEXT,  -- 'ecpay' | 'newebpay' | 'line_pay' | 'stripe'
  payment_id TEXT,  -- 第三方金流 transaction ID
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);


-- =========== ERP：訂閱 ===========
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,  -- 'free' | 'premium' | 'lifetime'
  plan_price INTEGER NOT NULL,  -- TWD / 月
  status TEXT DEFAULT 'active',  -- 'active' | 'cancelled' | 'past_due' | 'expired'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_method TEXT,
  external_id TEXT,  -- Stripe / 綠界 subscription ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON public.subscriptions(status);


-- =========== CRM：客服 ticket ===========
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT,  -- 'bug' | 'feature' | 'billing' | 'content' | 'other'
  priority TEXT DEFAULT 'normal',  -- 'low' | 'normal' | 'high' | 'urgent'
  status TEXT DEFAULT 'open',  -- 'open' | 'pending' | 'resolved' | 'closed'
  assigned_to UUID REFERENCES public.profiles(id),
  tags TEXT[] DEFAULT '{}',
  last_replied_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  sender_type TEXT NOT NULL,  -- 'user' | 'admin' | 'system'
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal_note BOOLEAN DEFAULT FALSE,  -- 內部備註、user 看不到
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON public.ticket_messages(ticket_id);


-- =========== 公告 / 推播 ===========
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  channel TEXT NOT NULL,  -- 'in_app' | 'email' | 'line' | 'push'
  target TEXT DEFAULT 'all',  -- 'all' | 'free' | 'premium' | 'segment'
  segment_filter JSONB,  -- 條件 (如 {role: 'admin', xp_min: 1000})
  status TEXT DEFAULT 'draft',  -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON public.broadcasts(status);


-- =========== 系統設定 ===========
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 預設 settings
INSERT INTO public.app_settings(key, value, description) VALUES
  ('site_announcement', '{"enabled": false, "message": "", "level": "info"}'::jsonb, '全站公告 banner'),
  ('maintenance_mode', '{"enabled": false, "message": "維護中、稍後再來"}'::jsonb, '維護模式'),
  ('signup_enabled', 'true'::jsonb, '是否開放註冊'),
  ('premium_price', '{"monthly": 299, "yearly": 2990, "lifetime": 15000}'::jsonb, 'Premium 訂閱定價'),
  ('feature_flags', '{"ai_companion": false, "line_login": true, "discord": false}'::jsonb, '功能開關')
ON CONFLICT (key) DO NOTHING;


-- =========== 操作紀錄（Audit log）===========
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id),
  actor_username TEXT,
  action TEXT NOT NULL,  -- 'user.banned' | 'order.refunded' | 'setting.changed' ...
  target_type TEXT,  -- 'user' | 'order' | 'setting'
  target_id TEXT,
  changes JSONB,  -- {before: ..., after: ...}
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);


-- =========== profile 加 last_active_at（如果還沒有）===========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;


-- =========== 書籤 ===========
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT,
  note TEXT,  -- 短評論
  color TEXT DEFAULT 'yellow',  -- 'yellow' | 'red' | 'green' | 'blue'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_lesson ON public.bookmarks(lesson_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_own" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);


-- =========== Playground 儲存（user 改的 code）===========
CREATE TABLE IF NOT EXISTS public.playgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  playground_key TEXT NOT NULL,  -- 一個 lesson 可能多個 playground
  language TEXT NOT NULL,  -- 'html' | 'css' | 'js' | 'python'
  code TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, playground_key)
);

CREATE INDEX IF NOT EXISTS idx_playgrounds_user_lesson ON public.playgrounds(user_id, lesson_id);

ALTER TABLE public.playgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playgrounds_own" ON public.playgrounds
  FOR ALL USING (auth.uid() = user_id);


-- =========== 學習紀錄（更詳細的事件）===========
CREATE TABLE IF NOT EXISTS public.learning_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'lesson_start' | 'lesson_complete' | 'quiz_pass' | 'playground_run' | 'note_create' | 'bookmark'
  chapter_id INT,
  lesson_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learn_events_user ON public.learning_events(user_id, created_at DESC);

ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_events_own" ON public.learning_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "learning_events_insert_own" ON public.learning_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =========== 證書 ===========
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,  -- 'chapter' | 'path' | 'all'
  cert_key TEXT NOT NULL,  -- 'ch01' | 'frontend' | 'all'
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  verification_code TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, cert_key)
);

CREATE INDEX IF NOT EXISTS idx_certs_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certs_verify ON public.certificates(verification_code);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates_own_read" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id OR verification_code IS NOT NULL);


-- =========== RLS Policies ===========
-- 後台 table 全部只給 admin
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- User 可看 / 改自己的訂單
CREATE POLICY "users_view_own_orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_subs" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- User 可建 ticket 看自己
CREATE POLICY "users_create_tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_view_own_tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

-- User 可看 ticket 自己回（非內部備註）
CREATE POLICY "users_view_ticket_msgs" ON public.ticket_messages
  FOR SELECT USING (
    NOT is_internal_note AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "users_create_ticket_msgs" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    sender_type = 'user' AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- App settings 可公開讀（部分）—用 view 控制
CREATE POLICY "public_read_settings" ON public.app_settings
  FOR SELECT USING (true);

-- 其他 admin 用 service_role 寫入、不需 policy
