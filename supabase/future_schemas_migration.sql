-- ========================================================================
-- future_schemas_migration.sql
--
-- 一次性建好所有未做 feature 需要的資料表。
-- 對應 BACKLOG：P4-01/03/04/08/09/15/16/17/18/19/20/21、LT-13/16、MED-06。
--
-- 全表設計原則：
--   - id UUID DEFAULT gen_random_uuid()
--   - created_at / updated_at TIMESTAMPTZ DEFAULT NOW()
--   - 所有表 ENABLE ROW LEVEL SECURITY
--   - admin role 透過 EXISTS profile.role='admin' 子查詢判斷
--   - 用戶自己的資料：auth.uid() = user_id
-- ========================================================================

-- ========================================================================
-- §1 P4-01：章節 / lesson DB cutover
--    取代 src/data/chapters/*.json 為來源。前台 getChapter() 改讀這兩張表。
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.chapters (
  id              INTEGER PRIMARY KEY,                  -- 對齊舊 JSON 的 chapter id
  slug            TEXT,
  stage           TEXT NOT NULL,                         -- '1'-'6' / 'appendix'
  title           TEXT NOT NULL,
  subtitle        TEXT,
  icon            TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'published'
                    CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  difficulty      TEXT NOT NULL DEFAULT 'beginner',
  prerequisites   INTEGER[] DEFAULT '{}',
  estimated_hours INTEGER DEFAULT 0,
  outcomes        JSONB DEFAULT '[]'::jsonb,
  boss            JSONB,
  summary         JSONB DEFAULT '[]'::jsonb,
  faq             JSONB DEFAULT '[]'::jsonb,
  scheduled_publish_at TIMESTAMPTZ,                      -- P4-04 排程發布
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_status ON public.chapters(status);
CREATE INDEX IF NOT EXISTS idx_chapters_stage  ON public.chapters(stage);

CREATE TABLE IF NOT EXISTS public.lessons (
  id              TEXT PRIMARY KEY,                      -- '1.1', '17.3' 等對齊舊格式
  chapter_id      INTEGER NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  number          TEXT NOT NULL,                         -- 'LESSON 1.1'
  title           TEXT NOT NULL,
  one_line_summary TEXT,
  analogy         TEXT,
  content         TEXT,                                  -- markdown / html
  outline         JSONB DEFAULT '[]'::jsonb,
  resource_groups JSONB,
  tip             JSONB,
  exercise        JSONB,
  playgrounds     JSONB DEFAULT '[]'::jsonb,
  mini_quiz       JSONB,
  files           JSONB,
  xp              INTEGER NOT NULL DEFAULT 10,
  sort_order      INTEGER NOT NULL DEFAULT 0,            -- 章內排序
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter_id, sort_order);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons  ENABLE ROW LEVEL SECURITY;

-- 任何人都可讀已發布的章節 / lesson
DROP POLICY IF EXISTS chapters_public_select ON public.chapters;
CREATE POLICY chapters_public_select ON public.chapters
  FOR SELECT USING (status = 'published' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

DROP POLICY IF EXISTS lessons_public_select ON public.lessons;
CREATE POLICY lessons_public_select ON public.lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chapters c WHERE c.id = chapter_id AND
      (c.status = 'published' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor'))))
  );

-- admin / editor 可寫
DROP POLICY IF EXISTS chapters_admin_write ON public.chapters;
CREATE POLICY chapters_admin_write ON public.chapters
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

DROP POLICY IF EXISTS lessons_admin_write ON public.lessons;
CREATE POLICY lessons_admin_write ON public.lessons
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_chapter_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_chapters_updated_at ON public.chapters;
CREATE TRIGGER trg_chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.touch_chapter_updated_at();
DROP TRIGGER IF EXISTS trg_lessons_updated_at ON public.lessons;
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.touch_chapter_updated_at();

-- P4-04：部落格 / 公告 排程發布欄位（若尚無）
ALTER TABLE public.user_blog_articles
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_user_blog_scheduled
  ON public.user_blog_articles(scheduled_publish_at) WHERE scheduled_publish_at IS NOT NULL;

-- ========================================================================
-- §2 LT-13：User report 檢舉收件箱
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.user_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type     TEXT NOT NULL
                    CHECK (target_type IN ('thread','reply','blog_article','blog_comment','user','ai_message')),
  target_id       TEXT NOT NULL,                        -- 用 TEXT 統一、forum 是 UUID、blog 是 UUID 都 OK
  target_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL
                    CHECK (reason IN ('spam','harassment','hate_speech','sexual','illegal','self_harm','other')),
  note            TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','resolved','dismissed','escalated')),
  resolution_note TEXT,
  resolved_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status      ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target      ON public.user_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter    ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_owner ON public.user_reports(target_owner_id);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_user_insert ON public.user_reports;
CREATE POLICY reports_user_insert ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS reports_admin_all ON public.user_reports;
CREATE POLICY reports_admin_all ON public.user_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 使用者可看自己提交的
DROP POLICY IF EXISTS reports_own_select ON public.user_reports;
CREATE POLICY reports_own_select ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ========================================================================
-- §3 LT-16：遊戲化規則編輯器（XP / Z-coin / 成就條件）
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.gamification_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL
                  CHECK (kind IN ('xp_event','coin_event','achievement_trigger','streak_bonus','level_reward')),
  key          TEXT NOT NULL,                            -- 例：'lesson_complete' / 'forum_reply_create'
  value        JSONB NOT NULL,                           -- { xp: 10, multiplier?: 2, ... }
  enabled      BOOLEAN NOT NULL DEFAULT true,
  note         TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (kind, key)
);

ALTER TABLE public.gamification_rules ENABLE ROW LEVEL SECURITY;

-- 任何人可讀（前端要顯示給用戶看 reward）
DROP POLICY IF EXISTS gamification_public_select ON public.gamification_rules;
CREATE POLICY gamification_public_select ON public.gamification_rules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS gamification_admin_write ON public.gamification_rules;
CREATE POLICY gamification_admin_write ON public.gamification_rules
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS gamification_admin_update ON public.gamification_rules;
CREATE POLICY gamification_admin_update ON public.gamification_rules
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS gamification_admin_delete ON public.gamification_rules;
CREATE POLICY gamification_admin_delete ON public.gamification_rules
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §4 P4-08：Referral 邀請碼
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  code         TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uses_count   INTEGER NOT NULL DEFAULT 0,
  max_uses     INTEGER,                                  -- NULL = 無上限
  enabled      BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)                                       -- 每個 user 一組 code
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code            TEXT REFERENCES public.referral_codes(code) ON DELETE SET NULL,
  signed_up_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_lesson_at TIMESTAMPTZ,                          -- 觸發 referrer 獎勵的時機
  reward_granted  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (referred_id)                                  -- 每個使用者只能被推薦一次
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refcodes_own_all ON public.referral_codes;
CREATE POLICY refcodes_own_all ON public.referral_codes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS refcodes_admin_all ON public.referral_codes;
CREATE POLICY refcodes_admin_all ON public.referral_codes
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS referrals_own_select ON public.referrals;
CREATE POLICY referrals_own_select ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS referrals_admin_all ON public.referrals;
CREATE POLICY referrals_admin_all ON public.referrals
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §5 P4-09：Segment 儲存
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.user_segments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  filter_json  JSONB NOT NULL,                          -- e.g. {"xp_gte":100,"role":"member"}
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS segments_admin_all ON public.user_segments;
CREATE POLICY segments_admin_all ON public.user_segments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §6 P4-15：Email campaigns + 開信率
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,
  segment_id    UUID REFERENCES public.user_segments(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  open_count    INTEGER NOT NULL DEFAULT 0,
  click_count   INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_recipients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email        TEXT NOT NULL,
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  first_click_at TIMESTAMPTZ,
  bounced      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON public.email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_user     ON public.email_recipients(user_id);

ALTER TABLE public.email_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_camp_admin_all ON public.email_campaigns;
CREATE POLICY email_camp_admin_all ON public.email_campaigns
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS email_recip_admin_all ON public.email_recipients;
CREATE POLICY email_recip_admin_all ON public.email_recipients
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §7 P4-16：Web Vitals dashboard
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.web_vitals (
  id           BIGSERIAL PRIMARY KEY,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id   TEXT,
  metric       TEXT NOT NULL CHECK (metric IN ('LCP','INP','CLS','FCP','TTFB','FID')),
  value        DOUBLE PRECISION NOT NULL,
  rating       TEXT CHECK (rating IN ('good','needs-improvement','poor')),
  page_path    TEXT,
  navigation_type TEXT,
  device_type  TEXT
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_time ON public.web_vitals(metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_path        ON public.web_vitals(page_path);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

-- anon 可寫（beacon endpoint）但只能 INSERT
DROP POLICY IF EXISTS web_vitals_insert_any ON public.web_vitals;
CREATE POLICY web_vitals_insert_any ON public.web_vitals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS web_vitals_admin_select ON public.web_vitals;
CREATE POLICY web_vitals_admin_select ON public.web_vitals
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §8 P4-17：公開 changelog
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version      TEXT,                                    -- e.g. '2026.05.23' / 'v1.4.0'
  title        TEXT NOT NULL,
  body_md      TEXT NOT NULL,
  tags         TEXT[] DEFAULT '{}',                     -- e.g. {'feature','fix','breaking'}
  published    BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_published ON public.changelog_entries(published_at DESC) WHERE published = true;

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS changelog_public_select ON public.changelog_entries;
CREATE POLICY changelog_public_select ON public.changelog_entries
  FOR SELECT USING (published = true OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

DROP POLICY IF EXISTS changelog_admin_write ON public.changelog_entries;
CREATE POLICY changelog_admin_write ON public.changelog_entries
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- ========================================================================
-- §9 P4-18：A/B 測試
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT UNIQUE NOT NULL,                    -- 程式碼用的 key，e.g. 'pet-shape'
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','running','paused','completed')),
  variants     JSONB NOT NULL,                          -- [{key:'control',weight:50},{key:'B',weight:50}]
  goal_event   TEXT,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ab_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_id      TEXT,
  variant_key  TEXT NOT NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (experiment_id, user_id),
  UNIQUE (experiment_id, anon_id)
);

CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON public.ab_assignments(user_id);

CREATE TABLE IF NOT EXISTS public.ab_events (
  id             BIGSERIAL PRIMARY KEY,
  experiment_id  UUID NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  variant_key    TEXT NOT NULL,
  event          TEXT NOT NULL,                         -- 'exposure' / 'conversion' / custom
  user_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  anon_id        TEXT,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta           JSONB
);

CREATE INDEX IF NOT EXISTS idx_ab_events_exp_time ON public.ab_events(experiment_id, occurred_at DESC);

ALTER TABLE public.ab_experiments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_events       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ab_exp_public_select ON public.ab_experiments;
CREATE POLICY ab_exp_public_select ON public.ab_experiments
  FOR SELECT USING (status = 'running' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS ab_exp_admin_write ON public.ab_experiments;
CREATE POLICY ab_exp_admin_write ON public.ab_experiments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS ab_assign_admin_all ON public.ab_assignments;
CREATE POLICY ab_assign_admin_all ON public.ab_assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS ab_assign_insert_any ON public.ab_assignments;
CREATE POLICY ab_assign_insert_any ON public.ab_assignments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS ab_events_insert_any ON public.ab_events;
CREATE POLICY ab_events_insert_any ON public.ab_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS ab_events_admin_select ON public.ab_events;
CREATE POLICY ab_events_admin_select ON public.ab_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §10 P4-19：'teacher' / 'assistant' role 允許
--    profiles.role 現在多了 teacher、editor、assistant 三個層級。
--    若 profiles.role 有 CHECK 限制、放寬。
-- ========================================================================

DO $$
BEGIN
  -- 嘗試放寬 CHECK（若有）。沒有就略過。
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('member','editor','admin','teacher','assistant'));
END $$;

-- ========================================================================
-- §11 P4-20：assignments + submissions
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    INTEGER REFERENCES public.chapters(id) ON DELETE SET NULL,
  lesson_id     TEXT REFERENCES public.lessons(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description_md TEXT NOT NULL,
  max_score     INTEGER NOT NULL DEFAULT 100,
  due_date      DATE,
  is_required   BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_md    TEXT NOT NULL,
  attachments   JSONB DEFAULT '[]'::jsonb,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score         INTEGER,
  feedback_md   TEXT,
  graded_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  graded_at     TIMESTAMPTZ,
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_subs_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_subs_user       ON public.submissions(user_id);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assignments_public_select ON public.assignments;
CREATE POLICY assignments_public_select ON public.assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS assignments_teacher_write ON public.assignments;
CREATE POLICY assignments_teacher_write ON public.assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','editor')));

DROP POLICY IF EXISTS subs_own_all ON public.submissions;
CREATE POLICY subs_own_all ON public.submissions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS subs_teacher_grade ON public.submissions;
CREATE POLICY subs_teacher_grade ON public.submissions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','assistant')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','teacher','assistant')));

-- ========================================================================
-- §12 P4-21：AI 對話審核 (content moderation)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.ai_moderation_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID,                                  -- ai_messages.id（若有）
  conversation_id UUID,                                -- ai_conversations.id
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role          TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content_snippet TEXT NOT NULL,
  flag_reason   TEXT NOT NULL
                  CHECK (flag_reason IN ('keyword','user_report','classifier','manual','self_harm','pii_leak')),
  severity      TEXT NOT NULL DEFAULT 'warn'
                  CHECK (severity IN ('info','warn','high','critical')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','dismissed','escalated','resolved')),
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_mod_status     ON public.ai_moderation_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_mod_user       ON public.ai_moderation_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_mod_severity   ON public.ai_moderation_flags(severity);

ALTER TABLE public.ai_moderation_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_mod_admin_all ON public.ai_moderation_flags;
CREATE POLICY ai_mod_admin_all ON public.ai_moderation_flags
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================================================
-- §13 MED-06：Impersonate 紀錄
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.admin_impersonations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  ip_hash         TEXT
);

CREATE INDEX IF NOT EXISTS idx_impersonations_admin  ON public.admin_impersonations(admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonations_target ON public.admin_impersonations(target_user_id);

ALTER TABLE public.admin_impersonations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS impers_admin_all ON public.admin_impersonations;
CREATE POLICY impers_admin_all ON public.admin_impersonations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 被 impersonate 的使用者可看自己被誰看了（透明度）
DROP POLICY IF EXISTS impers_target_select ON public.admin_impersonations;
CREATE POLICY impers_target_select ON public.admin_impersonations
  FOR SELECT USING (auth.uid() = target_user_id);

-- ========================================================================
-- §14 公用 trigger：更新 updated_at（已存在的 function 不會被覆蓋）
-- ========================================================================
-- 之前 chapter_versions 已建 next_chapter_version、不重建
