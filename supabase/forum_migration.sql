-- ============================================================
-- 討論區系統
-- 版塊 / 主題串 / 回覆（巢狀）/ reactions
-- 複用部落格的設計模式、適配 AI Island profiles
-- ============================================================

-- ── 1. 版塊 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     TEXT NOT NULL,                    -- 大分類：學習區/教學區/交流區/站務區
  name         TEXT NOT NULL,                    -- 版塊名稱
  slug         TEXT NOT NULL UNIQUE,             -- 網址用
  description  TEXT,
  emoji        TEXT DEFAULT '💬',
  sort_order   INT NOT NULL DEFAULT 0,
  post_role    TEXT NOT NULL DEFAULT 'member',   -- 'member'=人人可發、'admin'=僅管理員
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_boards_category ON public.forum_boards(category, sort_order);

-- ── 2. 主題串 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id      UUID NOT NULL REFERENCES public.forum_boards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',        -- TipTap HTML
  tags          TEXT[] NOT NULL DEFAULT '{}',
  is_pinned     BOOLEAN NOT NULL DEFAULT false,  -- 置頂
  is_featured   BOOLEAN NOT NULL DEFAULT false,  -- 精華
  is_locked     BOOLEAN NOT NULL DEFAULT false,  -- 鎖定（不能再回覆）
  view_count    INT NOT NULL DEFAULT 0,
  reply_count   INT NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector tsvector,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_threads_board    ON public.forum_threads(board_id, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user     ON public.forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned   ON public.forum_threads(board_id, is_pinned, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_search   ON public.forum_threads USING GIN (search_vector);

-- ── 3. 回覆（支援巢狀）──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  is_answer     BOOLEAN NOT NULL DEFAULT false,  -- 被採納為解答
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON public.forum_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON public.forum_replies(parent_id);

-- ── 4. reactions（對主題串）─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT '👍',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_thread ON public.forum_reactions(thread_id);

-- ── 5. 全文搜尋 trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.forum_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_search_vector ON public.forum_threads;
CREATE TRIGGER trg_forum_search_vector
  BEFORE INSERT OR UPDATE OF title, tags ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.forum_search_vector_update();

-- ── 6. 回覆數 / 最後回覆時間 自動維護 ───────────────────────
CREATE OR REPLACE FUNCTION public.forum_reply_count_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_reply_count ON public.forum_replies;
CREATE TRIGGER trg_forum_reply_count
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_reply_count_update();

-- ── 7. 瀏覽數 +1 RPC ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inc_forum_view(p_thread_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE forum_threads SET view_count = view_count + 1 WHERE id = p_thread_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.inc_forum_view(UUID) TO anon, authenticated;

-- ── 8. RLS ──────────────────────────────────────────────────
ALTER TABLE public.forum_boards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

-- 版塊：啟用的人人可讀
DROP POLICY IF EXISTS "forum_boards_read" ON public.forum_boards;
CREATE POLICY "forum_boards_read" ON public.forum_boards
  FOR SELECT USING (is_active = true);

-- 主題串：人人可讀、本人可寫
DROP POLICY IF EXISTS "forum_threads_read" ON public.forum_threads;
CREATE POLICY "forum_threads_read" ON public.forum_threads
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "forum_threads_own_write" ON public.forum_threads;
CREATE POLICY "forum_threads_own_write" ON public.forum_threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 回覆：人人可讀、登入者可發、本人可刪
DROP POLICY IF EXISTS "forum_replies_read" ON public.forum_replies;
CREATE POLICY "forum_replies_read" ON public.forum_replies
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "forum_replies_insert" ON public.forum_replies;
CREATE POLICY "forum_replies_insert" ON public.forum_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "forum_replies_own_delete" ON public.forum_replies;
CREATE POLICY "forum_replies_own_delete" ON public.forum_replies
  FOR DELETE USING (auth.uid() = user_id);

-- reactions：人人可讀、本人可寫
DROP POLICY IF EXISTS "forum_reactions_read" ON public.forum_reactions;
CREATE POLICY "forum_reactions_read" ON public.forum_reactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "forum_reactions_own" ON public.forum_reactions;
CREATE POLICY "forum_reactions_own" ON public.forum_reactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 9. 初始版塊資料 ─────────────────────────────────────────
INSERT INTO public.forum_boards (category, name, slug, description, emoji, sort_order, post_role) VALUES
  ('學習區', '新手提問',   'questions',    '有問題盡量問、沒有笨問題',           '❓', 10, 'member'),
  ('學習區', '學習心得',   'progress',     '分享學習過程、打卡互相鼓勵',         '📈', 11, 'member'),
  ('學習區', '卡關求助',   'help',         '貼 code、貼錯誤訊息、一起 debug',     '🆘', 12, 'member'),
  ('教學區', '教學文章',   'tutorials',    '社群成員寫的教學',                   '📖', 20, 'member'),
  ('教學區', '副本攻略',   'guides',       '針對 5 大副本的心得攻略',            '🗺️', 21, 'member'),
  ('教學區', '資源分享',   'resources',    '推薦好用的工具、文章、課程',         '🔗', 22, 'member'),
  ('交流區', '自我介紹',   'intro',        '新人報到、認識大家',                 '👋', 30, 'member'),
  ('交流區', '閒聊灌水',   'chat',         '輕鬆話題、什麼都能聊',               '☕', 31, 'member'),
  ('交流區', '作品展示',   'showcase',     '秀出你做的東西',                     '🎨', 32, 'member'),
  ('站務區', '公告',       'announcements','官方公告',                           '📢', 40, 'admin'),
  ('站務區', '意見回饋',   'feedback',     '許願、回報 bug、給建議',             '💡', 41, 'member')
ON CONFLICT (slug) DO NOTHING;
