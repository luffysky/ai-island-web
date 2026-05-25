-- ============================================================
-- 全站 RLS 補 WITH CHECK
-- 共 22 個 policy 缺 WITH CHECK、PostgREST 在某些情境會擋下 INSERT/UPDATE
-- 一次補完、確保 user 寫入 (bookmark / note / lesson_progress / quiz / etc) 都通
-- 安全性不變：USING 跟 WITH CHECK 用同樣的條件
-- ============================================================

-- ai_conversations
DROP POLICY IF EXISTS "ai_conv_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_own" ON public.ai_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ai_daily_quota
DROP POLICY IF EXISTS "ai_quota_own" ON public.ai_daily_quota;
CREATE POLICY "ai_quota_own" ON public.ai_daily_quota FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ai_messages
DROP POLICY IF EXISTS "ai_msg_own" ON public.ai_messages;
CREATE POLICY "ai_msg_own" ON public.ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()));

-- bookmarks 🔥 林董報的
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- breach_incidents
DROP POLICY IF EXISTS "breach_incidents_admin_all" ON public.breach_incidents;
CREATE POLICY "breach_incidents_admin_all" ON public.breach_incidents FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- canned_replies UPDATE
DROP POLICY IF EXISTS "canned_admin_update" ON public.canned_replies;
CREATE POLICY "canned_admin_update" ON public.canned_replies FOR UPDATE
  USING ((owner_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK ((owner_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- daily_quests
DROP POLICY IF EXISTS "dq_own" ON public.daily_quests;
CREATE POLICY "dq_own" ON public.daily_quests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- email_subscriptions admin
DROP POLICY IF EXISTS "email_subs_admin" ON public.email_subscriptions;
CREATE POLICY "email_subs_admin" ON public.email_subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- email_subscriptions own update
DROP POLICY IF EXISTS "email_subs_own_update" ON public.email_subscriptions;
CREATE POLICY "email_subs_own_update" ON public.email_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- env_change_requests admin update
DROP POLICY IF EXISTS "env_requests_admin_update" ON public.env_change_requests;
CREATE POLICY "env_requests_admin_update" ON public.env_change_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- gamification_rules admin update
DROP POLICY IF EXISTS "gamification_admin_update" ON public.gamification_rules;
CREATE POLICY "gamification_admin_update" ON public.gamification_rules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- lesson_progress 🔥 影響領 XP / 完成 lesson
DROP POLICY IF EXISTS "lp_own" ON public.lesson_progress;
CREATE POLICY "lp_own" ON public.lesson_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- media_assets UPDATE
DROP POLICY IF EXISTS "media_update" ON public.media_assets;
CREATE POLICY "media_update" ON public.media_assets FOR UPDATE
  USING ((auth.uid() = user_id) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK ((auth.uid() = user_id) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- notes 🔥 林董報的
DROP POLICY IF EXISTS "notes_modify_own" ON public.notes;
CREATE POLICY "notes_modify_own" ON public.notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- notifications UPDATE
DROP POLICY IF EXISTS "notif_self_update" ON public.notifications;
CREATE POLICY "notif_self_update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- pet_messages
DROP POLICY IF EXISTS "pet_messages_own" ON public.pet_messages;
CREATE POLICY "pet_messages_own" ON public.pet_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- pets
DROP POLICY IF EXISTS "pets_own_all" ON public.pets;
CREATE POLICY "pets_own_all" ON public.pets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- playgrounds
DROP POLICY IF EXISTS "playgrounds_own" ON public.playgrounds;
CREATE POLICY "playgrounds_own" ON public.playgrounds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles UPDATE
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- quiz_attempts 🔥 影響 quiz 加 XP
DROP POLICY IF EXISTS "qa_own" ON public.quiz_attempts;
CREATE POLICY "qa_own" ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_achievements 🔥 影響成就解鎖
DROP POLICY IF EXISTS "ua_own" ON public.user_achievements;
CREATE POLICY "ua_own" ON public.user_achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_api_keys
DROP POLICY IF EXISTS "user_keys_own" ON public.user_api_keys;
CREATE POLICY "user_keys_own" ON public.user_api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
