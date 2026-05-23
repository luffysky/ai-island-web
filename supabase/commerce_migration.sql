-- S6 商業化第一波（Paywall + AI 分層 + 客訴工單）

-- ============================================================
-- §1 章節 paywall：is_premium 旗標
-- ============================================================
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

-- 預設前 5 章免費、6+ 為 premium
UPDATE public.chapters SET is_premium = (id > 5) WHERE is_premium IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chapters_premium ON public.chapters(is_premium);

-- ============================================================
-- §2 單章購買（給沒訂閱但想單買的）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapter_purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id   INTEGER NOT NULL,
  amount_twd   INTEGER NOT NULL DEFAULT 99,
  order_no     TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

ALTER TABLE public.chapter_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cp_own_select ON public.chapter_purchases;
CREATE POLICY cp_own_select ON public.chapter_purchases FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cp_admin_all ON public.chapter_purchases;
CREATE POLICY cp_admin_all ON public.chapter_purchases
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- §3 客訴工單系統 P4-07
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email         TEXT,                                  -- 匿名訴客用
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general'
                   CHECK (category IN ('general','billing','bug','feature','complaint','refund','account')),
  priority      TEXT NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
  assigned_to   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user   ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON public.tickets(assigned_to);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_staff     BOOLEAN NOT NULL DEFAULT false,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_msg_ticket ON public.ticket_messages(ticket_id, created_at);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_own_select ON public.tickets;
CREATE POLICY tickets_own_select ON public.tickets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tickets_own_insert ON public.tickets;
CREATE POLICY tickets_own_insert ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tickets_admin_all ON public.tickets;
CREATE POLICY tickets_admin_all ON public.tickets
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','assistant')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','assistant')));

DROP POLICY IF EXISTS ticket_msg_user ON public.ticket_messages;
CREATE POLICY ticket_msg_user ON public.ticket_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS ticket_msg_admin ON public.ticket_messages;
CREATE POLICY ticket_msg_admin ON public.ticket_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','assistant')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','assistant')));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_ticket_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_ticket_updated_at();

-- ============================================================
-- §4 hasActiveSubscription helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated, anon, service_role;

-- ============================================================
-- §5 user_can_access_chapter helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_can_access_chapter(p_user_id UUID, p_chapter_id INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_premium BOOLEAN;
  v_role TEXT;
BEGIN
  -- 章節是免費的 → 任何人可看
  SELECT is_premium INTO v_premium FROM public.chapters WHERE id = p_chapter_id;
  IF NOT COALESCE(v_premium, false) THEN RETURN true; END IF;

  -- 未登入 + premium → 不行
  IF p_user_id IS NULL THEN RETURN false; END IF;

  -- admin / editor / teacher 永遠可看
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF v_role IN ('admin','editor','teacher','assistant') THEN RETURN true; END IF;

  -- 訂閱中 → 可看
  IF public.has_active_subscription(p_user_id) THEN RETURN true; END IF;

  -- 單章購買過 → 可看
  IF EXISTS (SELECT 1 FROM public.chapter_purchases WHERE user_id = p_user_id AND chapter_id = p_chapter_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_chapter(UUID, INTEGER) TO authenticated, anon, service_role;
