-- ===================================================
--  AI 島 V2.0 完整 Schema
--  含：會員 / 進度 / XP / 成就 / Quiz / 排行榜 / 後台
-- ===================================================

-- ============ 0. Extensions ============
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ 1. 使用者 Profile（擴展 auth.users）============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 30),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- 遊戲化欄位
  xp BIGINT DEFAULT 0 NOT NULL,
  level INT GENERATED ALWAYS AS (
    LEAST(60, GREATEST(1, FLOOR(POWER(xp / 100.0, 0.5))::INT + 1))
  ) STORED,
  z_coin INT DEFAULT 100 NOT NULL,
  hearts INT DEFAULT 5 NOT NULL CHECK (hearts BETWEEN 0 AND 5),
  hearts_recovered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Streak
  streak_days INT DEFAULT 0 NOT NULL,
  last_active_date DATE,

  -- 職業路線
  career_path TEXT CHECK (career_path IN (
    'frontend','fullstack','ai-engineer','data','freelance','indie'
  )),

  -- 角色 / 權限
  role TEXT DEFAULT 'member' CHECK (role IN ('member','editor','admin')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX idx_profiles_streak ON public.profiles(streak_days DESC);

-- ============ 2. Lesson 進度（每個 lesson 的完成記錄）============
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT NOT NULL CHECK (chapter_id BETWEEN 1 AND 60),
  lesson_id TEXT NOT NULL,  -- 如 '17.5'
  completed BOOLEAN DEFAULT TRUE,
  xp_awarded INT DEFAULT 10,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lp_user ON public.lesson_progress(user_id);
CREATE INDEX idx_lp_chapter ON public.lesson_progress(chapter_id);

-- ============ 3. Quiz 結果 ============
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT NOT NULL,
  quiz_id TEXT NOT NULL,
  score INT NOT NULL,       -- 0-100
  total_questions INT NOT NULL,
  correct INT NOT NULL,
  perfect BOOLEAN GENERATED ALWAYS AS (correct = total_questions) STORED,
  xp_awarded INT DEFAULT 0,
  z_coin_awarded INT DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_user_chapter ON public.quiz_attempts(user_id, chapter_id);
CREATE INDEX idx_qa_perfect ON public.quiz_attempts(perfect) WHERE perfect = TRUE;

-- ============ 4. 成就（定義 + 解鎖記錄）============
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,         -- 'first-blood', 'sql-master'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,          -- emoji
  category TEXT NOT NULL,      -- 'milestone','speed','social','perfect','hidden'
  xp_reward INT DEFAULT 100,
  z_coin_reward INT DEFAULT 20,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary'))
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ============ 5. 每日任務 ============
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_date DATE DEFAULT CURRENT_DATE,
  quest_type TEXT NOT NULL,  -- 'lesson','quiz','streak','exploration'
  target INT NOT NULL,
  progress INT DEFAULT 0,
  completed BOOLEAN GENERATED ALWAYS AS (progress >= target) STORED,
  claimed BOOLEAN DEFAULT FALSE,
  xp_reward INT DEFAULT 30,
  z_coin_reward INT DEFAULT 10,
  UNIQUE(user_id, quest_date, quest_type)
);

CREATE INDEX idx_dq_user_date ON public.daily_quests(user_id, quest_date);

-- ============ 6. XP 事件日誌（給後台分析）============
CREATE TABLE IF NOT EXISTS public.xp_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,       -- 'lesson_complete','quiz_perfect','streak_bonus'
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_xp_user_date ON public.xp_events(user_id, created_at DESC);

-- ============ 7. Z-coin 交易記錄 ============
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,         -- 正=賺、負=花
  balance_after INT NOT NULL,
  reason TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ 8. 筆記 / 心得 ============
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id INT NOT NULL,
  lesson_id TEXT,
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notes_user_chapter ON public.notes(user_id, chapter_id);
CREATE INDEX idx_notes_public ON public.notes(is_public, created_at DESC) WHERE is_public = TRUE;

-- ============ 9. 後台用：站台事件記錄 ============
CREATE TABLE IF NOT EXISTS public.admin_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ 10. 觸發器：lesson 完成 → XP + Streak ============
CREATE OR REPLACE FUNCTION update_user_on_lesson()
RETURNS TRIGGER AS $$
DECLARE
  current_streak INT;
  last_active DATE;
BEGIN
  -- 加 XP
  UPDATE public.profiles
  SET xp = xp + NEW.xp_awarded,
      updated_at = NOW()
  WHERE id = NEW.user_id
  RETURNING streak_days, last_active_date INTO current_streak, last_active;

  -- Streak 更新
  IF last_active IS NULL OR last_active < CURRENT_DATE - INTERVAL '1 day' THEN
    -- 中斷、歸 1
    UPDATE public.profiles SET streak_days = 1, last_active_date = CURRENT_DATE
    WHERE id = NEW.user_id;
  ELSIF last_active = CURRENT_DATE - INTERVAL '1 day' THEN
    -- 連續中、+1
    UPDATE public.profiles SET streak_days = streak_days + 1, last_active_date = CURRENT_DATE
    WHERE id = NEW.user_id;
  -- 同一天什麼都不做
  END IF;

  -- 寫 XP event
  INSERT INTO public.xp_events(user_id, amount, reason, meta)
  VALUES (NEW.user_id, NEW.xp_awarded, 'lesson_complete',
          jsonb_build_object('chapter', NEW.chapter_id, 'lesson', NEW.lesson_id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_lesson_complete
AFTER INSERT ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION update_user_on_lesson();

-- ============ 11. 排行榜 View ============
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  id, username, display_name, avatar_url,
  xp, level, streak_days,
  ROW_NUMBER() OVER (ORDER BY xp DESC) AS rank
FROM public.profiles
WHERE xp > 0
LIMIT 100;

-- ============ 12. RLS 政策 ============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- profiles：自己讀寫、其他人讀（公開資料）
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- lesson_progress：只能讀寫自己
CREATE POLICY "lp_own" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);

-- quiz_attempts：只能讀寫自己
CREATE POLICY "qa_own" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- user_achievements：自己讀、自己解鎖
CREATE POLICY "ua_own" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- daily_quests：自己讀寫
CREATE POLICY "dq_own" ON public.daily_quests FOR ALL USING (auth.uid() = user_id);

-- xp_events：自己讀、系統寫
CREATE POLICY "xe_read_own" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);

-- coin_transactions：自己讀
CREATE POLICY "ct_read_own" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

-- notes：公開的人人讀、私人只能自己讀寫
CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (
  is_public = TRUE OR auth.uid() = user_id
);
CREATE POLICY "notes_modify_own" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- ============ 13. 初始化成就 ============
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, z_coin_reward, rarity) VALUES
('first-blood', '初試啼聲', '完成第一個 lesson', '🩸', 'milestone', 50, 10, 'common'),
('first-chapter', '初出茅廬', '完成第一章', '📖', 'milestone', 200, 30, 'common'),
('first-quiz-perfect', '滿分達人', '第一個滿分 quiz', '💯', 'perfect', 100, 20, 'common'),
('streak-7', '一週恆心', '連續 7 天學習', '🔥', 'speed', 300, 50, 'rare'),
('streak-30', '鐵人', '連續 30 天學習', '⚔️', 'speed', 1500, 200, 'epic'),
('streak-100', '不死鳥', '連續 100 天學習', '🦅', 'speed', 8000, 1000, 'legendary'),
('night-owl', '夜貓子', '凌晨 2-5 點學習 3 次', '🦉', 'hidden', 200, 30, 'rare'),
('early-bird', '早起鳥', '早上 5-7 點學習 3 次', '🌅', 'hidden', 200, 30, 'rare'),
('weekend-warrior', '週末勇者', '連續 4 個週末學習', '⚔️', 'speed', 400, 80, 'rare'),
('speed-runner', '速通玩家', '一天完成 5 個 lesson', '⚡', 'speed', 300, 50, 'rare'),
('completionist', '完美主義', '單章 100% 完成', '💎', 'perfect', 500, 100, 'epic'),
('polyglot', '多語精通', '完成 5 種程式語言章節', '🌏', 'milestone', 1000, 200, 'epic'),
('sql-master', 'SQL 大師', '完成 Ch17 + 滿分 quiz', '🗄️', 'perfect', 500, 100, 'rare'),
('ai-tamer', 'AI 馴獸師', '完成所有 AI 章節', '🤖', 'milestone', 2000, 300, 'epic'),
('frontend-artisan', '介面雕刻師', '完成前端職業路線', '🎨', 'milestone', 1500, 250, 'epic'),
('fullstack-guardian', '全端守護者', '完成全端職業路線', '🛡️', 'milestone', 2500, 400, 'epic'),
('indie-king', '島嶼之王', '完成 Indie 創業家路線', '👑', 'milestone', 3000, 500, 'legendary'),
('first-note', '初寫心得', '第一篇公開筆記', '📝', 'social', 50, 10, 'common'),
('popular-note', '人氣文章', '筆記獲 10 個讚', '⭐', 'social', 300, 50, 'rare'),
('level-10', '小有所成', '達到 Lv 10', '🎯', 'milestone', 200, 50, 'common'),
('level-30', '進階玩家', '達到 Lv 30', '🌟', 'milestone', 800, 150, 'rare'),
('level-60', 'AI 島主', '達到 Lv 60', '👑', 'milestone', 5000, 1000, 'legendary'),
('coin-1000', '小富翁', '累積 1000 Z-coin', '💰', 'milestone', 200, 0, 'common'),
('helper', '熱心助人', '幫忙回答 5 則問題', '🤝', 'social', 400, 80, 'rare'),
('explorer', '探索者', '進入過 10 個不同章節', '🗺️', 'milestone', 300, 60, 'common')
ON CONFLICT (id) DO NOTHING;
