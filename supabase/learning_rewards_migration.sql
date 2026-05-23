-- ============================================================
-- 學習獎勵系統（林董 2026-05-23）
--   §1 daily_quests：每天自動產生的任務、完成領 z 幣
--   §2 daily_quiz_pool：每日測驗題庫（可從學過章節 quiz / leetcode 抽）
--   §3 daily_quiz_attempts：每天每人測驗紀錄
--   §4 leetcode_questions：leetcode 題庫（可導入）
--   §5 quest_complete RPC、daily_quiz_grade RPC
-- ============================================================

-- §1 每日任務
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  quest_type   TEXT NOT NULL
                  CHECK (quest_type IN ('complete_lessons','daily_checkin','ai_chat','forum_post','blog_write','daily_quiz','bookmark')),
  target       INTEGER NOT NULL DEFAULT 1,
  progress     INTEGER NOT NULL DEFAULT 0,
  completed    BOOLEAN NOT NULL DEFAULT false,
  claimed      BOOLEAN NOT NULL DEFAULT false,
  reward_xp    INTEGER NOT NULL DEFAULT 0,
  reward_z     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  claimed_at   TIMESTAMPTZ,
  UNIQUE (user_id, quest_date, quest_type)
);

CREATE INDEX IF NOT EXISTS idx_quests_user_date ON public.daily_quests(user_id, quest_date DESC);
CREATE INDEX IF NOT EXISTS idx_quests_unclaimed ON public.daily_quests(user_id) WHERE completed = true AND claimed = false;

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quests_own_select ON public.daily_quests;
CREATE POLICY quests_own_select ON public.daily_quests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS quests_admin_all ON public.daily_quests;
CREATE POLICY quests_admin_all ON public.daily_quests
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- §2 + §3 每日測驗
CREATE TABLE IF NOT EXISTS public.daily_quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  questions   JSONB NOT NULL,                       -- [{q,options,answer,source:'chapter'|'leetcode',source_id}]
  answers     JSONB,                                 -- ['a','b',...]
  correct     INTEGER,
  total       INTEGER,
  reward_xp   INTEGER NOT NULL DEFAULT 0,
  reward_z    INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quiz_date)
);

ALTER TABLE public.daily_quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_quiz_own ON public.daily_quiz_attempts;
CREATE POLICY daily_quiz_own ON public.daily_quiz_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- §4 leetcode 題庫（可手動或 import script 灌）
CREATE TABLE IF NOT EXISTS public.leetcode_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,                -- 'two-sum'
  number        INTEGER,                              -- leetcode # 編號
  title         TEXT NOT NULL,
  difficulty    TEXT CHECK (difficulty IN ('easy','medium','hard')),
  tags          TEXT[] DEFAULT '{}',
  body_md       TEXT NOT NULL,
  options       JSONB NOT NULL,                       -- [{label,value}]
  answer        TEXT NOT NULL,                        -- 'a' / 'b' / ...
  explanation   TEXT,
  language      TEXT DEFAULT 'any',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leetcode_difficulty ON public.leetcode_questions(difficulty) WHERE active = true;

ALTER TABLE public.leetcode_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leetcode_public_select ON public.leetcode_questions;
CREATE POLICY leetcode_public_select ON public.leetcode_questions FOR SELECT USING (active = true);
DROP POLICY IF EXISTS leetcode_admin_write ON public.leetcode_questions;
CREATE POLICY leetcode_admin_write ON public.leetcode_questions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- §5 ensure_daily_quests RPC：登入 / 首頁開啟時呼叫、若今天沒任務就建立 3 個
CREATE OR REPLACE FUNCTION public.ensure_daily_quests()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_count   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT COUNT(*) INTO v_count FROM daily_quests
  WHERE user_id = v_user_id AND quest_date = v_today;

  IF v_count > 0 THEN
    RETURN jsonb_build_object('ok', true, 'created', 0, 'existing', v_count);
  END IF;

  -- 預設 4 個任務（每天）
  INSERT INTO daily_quests(user_id, quest_date, quest_type, target, reward_xp, reward_z) VALUES
    (v_user_id, v_today, 'complete_lessons', 3, 30, 10),
    (v_user_id, v_today, 'daily_checkin',    1, 10, 5),
    (v_user_id, v_today, 'ai_chat',          1, 10, 3),
    (v_user_id, v_today, 'daily_quiz',       1, 20, 8)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'created', 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_daily_quests() TO authenticated;

-- §6 claim_quest_reward RPC：完成且未領 → 領取
CREATE OR REPLACE FUNCTION public.claim_quest_reward(p_quest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_quest    daily_quests%ROWTYPE;
  v_balance  INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT * INTO v_quest FROM daily_quests WHERE id = p_quest_id AND user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_quest.claimed THEN RETURN jsonb_build_object('ok', false, 'error', 'already_claimed'); END IF;
  IF NOT v_quest.completed THEN RETURN jsonb_build_object('ok', false, 'error', 'not_completed'); END IF;

  -- 標記領取
  UPDATE daily_quests SET claimed = true, claimed_at = NOW() WHERE id = p_quest_id;

  -- 發 XP + z 幣
  INSERT INTO xp_events(user_id, amount, reason, meta)
  VALUES (v_user_id, v_quest.reward_xp, 'quest_reward', jsonb_build_object('quest_type', v_quest.quest_type));

  UPDATE profiles
  SET xp = xp + v_quest.reward_xp,
      z_coin = COALESCE(z_coin, 0) + v_quest.reward_z
  WHERE id = v_user_id
  RETURNING z_coin INTO v_balance;

  INSERT INTO coin_transactions(user_id, amount, balance_after, reason, meta)
  VALUES (v_user_id, v_quest.reward_z, COALESCE(v_balance, v_quest.reward_z), 'quest_reward', jsonb_build_object('quest_type', v_quest.quest_type));

  RETURN jsonb_build_object(
    'ok', true,
    'reward_xp', v_quest.reward_xp,
    'reward_z', v_quest.reward_z,
    'z_balance', v_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_quest_reward(UUID) TO authenticated;

-- §7 increment_quest_progress RPC：呼叫時根據 quest_type 增加 progress、達 target 自動標 completed
CREATE OR REPLACE FUNCTION public.increment_quest_progress(p_quest_type TEXT, p_delta INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_quest   daily_quests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_logged_in');
  END IF;

  SELECT * INTO v_quest FROM daily_quests
  WHERE user_id = v_user_id AND quest_date = v_today AND quest_type = p_quest_type;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'skipped', 'no_quest'); END IF;
  IF v_quest.completed THEN RETURN jsonb_build_object('ok', true, 'skipped', 'already_completed'); END IF;

  UPDATE daily_quests
  SET progress = LEAST(target, progress + p_delta),
      completed = (progress + p_delta >= target),
      completed_at = CASE WHEN progress + p_delta >= target THEN NOW() ELSE completed_at END
  WHERE id = v_quest.id
  RETURNING * INTO v_quest;

  RETURN jsonb_build_object(
    'ok', true,
    'progress', v_quest.progress,
    'target', v_quest.target,
    'completed', v_quest.completed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_quest_progress(TEXT, INTEGER) TO authenticated;
