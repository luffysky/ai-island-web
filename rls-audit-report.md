# RLS 安全審計報告

產生時間：2026-05-25T02:03:49.556Z

掃描 93 張表、151 條 policy


## 🔴 致命：RLS 開但 0 policy (這些表只有 service_role 能寫) (9)

- `achievements`
- `admin_events`
- `ai_api_keys`
- `ai_usage_daily`
- `analytics_snapshots`
- `audit_logs`
- `broadcasts`
- `seo_pages`
- `seo_redirects`


## 🟡 警告：RLS 未啟用 (任何人能直接撈) (0)



## ⚠️ FOR {ALL/INSERT/UPDATE} policy 缺 WITH CHECK (22)

> Postgres 對 FOR ALL 缺 WITH CHECK 時、會用 USING 當 check、但某些 client 版本 / 升級時會擋下。最佳實踐：兩個都寫。


- `ai_conversations` · ALL · `ai_conv_own` · USING: `(auth.uid() = user_id)`
- `ai_daily_quota` · ALL · `ai_quota_own` · USING: `(auth.uid() = user_id)`
- `ai_messages` · ALL · `ai_msg_own` · USING: `(EXISTS ( SELECT 1
   FROM ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = auth.uid()))))`
- `bookmarks` · ALL · `bookmarks_own` · USING: `(auth.uid() = user_id)`
- `breach_incidents` · ALL · `breach_incidents_admin_all` · USING: `(EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- `canned_replies` · UPDATE · `canned_admin_update` · USING: `((owner_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))`
- `daily_quests` · ALL · `dq_own` · USING: `(auth.uid() = user_id)`
- `email_subscriptions` · ALL · `email_subs_admin` · USING: `(EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- `email_subscriptions` · UPDATE · `email_subs_own_update` · USING: `(auth.uid() = user_id)`
- `env_change_requests` · UPDATE · `env_requests_admin_update` · USING: `(EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- `gamification_rules` · UPDATE · `gamification_admin_update` · USING: `(EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))`
- `lesson_progress` · ALL · `lp_own` · USING: `(auth.uid() = user_id)`
- `media_assets` · UPDATE · `media_update` · USING: `((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))`
- `notes` · ALL · `notes_modify_own` · USING: `(auth.uid() = user_id)`
- `notifications` · UPDATE · `notif_self_update` · USING: `(user_id = auth.uid())`
- `pet_messages` · ALL · `pet_messages_own` · USING: `(auth.uid() = user_id)`
- `pets` · ALL · `pets_own_all` · USING: `(auth.uid() = user_id)`
- `playgrounds` · ALL · `playgrounds_own` · USING: `(auth.uid() = user_id)`
- `profiles` · UPDATE · `profiles_update_own` · USING: `(auth.uid() = id)`
- `quiz_attempts` · ALL · `qa_own` · USING: `(auth.uid() = user_id)`
- `user_achievements` · ALL · `ua_own` · USING: `(auth.uid() = user_id)`
- `user_api_keys` · ALL · `user_keys_own` · USING: `(auth.uid() = user_id)`


## 📋 全表 RLS 狀態總覽

| 表 | RLS | policy 數 | INSERT 保護 |
|---|---|---|---|
| `ab_assignments` | ✓ | 2 | ✅ |
| `ab_events` | ✓ | 2 | ✅ |
| `ab_experiments` | ✓ | 2 | ✅ |
| `achievements` | ✓ | 0 | 🔴 空 |
| `admin_events` | ✓ | 0 | 🔴 空 |
| `admin_impersonations` | ✓ | 2 | ✅ |
| `admin_line_prefs` | ✓ | 1 | ✅ |
| `ai_api_keys` | ✓ | 0 | 🔴 空 |
| `ai_conversations` | ✓ | 1 | 🟡 無 CHECK |
| `ai_daily_quota` | ✓ | 1 | 🟡 無 CHECK |
| `ai_messages` | ✓ | 1 | 🟡 無 CHECK |
| `ai_models` | ✓ | 1 | — |
| `ai_moderation_flags` | ✓ | 1 | ✅ |
| `ai_moderation_keywords` | ✓ | 2 | ✅ |
| `ai_response_cache` | ✓ | 1 | — |
| `ai_usage_daily` | ✓ | 0 | 🔴 空 |
| `analytics_events` | ✓ | 1 | — |
| `analytics_page_views` | ✓ | 1 | — |
| `analytics_sessions` | ✓ | 1 | — |
| `analytics_snapshots` | ✓ | 0 | 🔴 空 |
| `app_settings` | ✓ | 1 | — |
| `assignments` | ✓ | 2 | ✅ |
| `audit_logs` | ✓ | 0 | 🔴 空 |
| `blog_comment_likes` | ✓ | 2 | ✅ |
| `blog_comments` | ✓ | 3 | ✅ |
| `blog_reactions` | ✓ | 3 | ✅ |
| `blog_series` | ✓ | 2 | ✅ |
| `blog_subscribers` | ✓ | 2 | ✅ |
| `bookmarks` | ✓ | 1 | 🟡 無 CHECK |
| `breach_incidents` | ✓ | 1 | 🟡 無 CHECK |
| `broadcasts` | ✓ | 0 | 🔴 空 |
| `canned_replies` | ✓ | 4 | ✅ |
| `certificates` | ✓ | 1 | — |
| `changelog_entries` | ✓ | 2 | ✅ |
| `chapter_purchases` | ✓ | 2 | ✅ |
| `chapter_quizzes` | ✓ | 1 | — |
| `chapter_versions` | ✓ | 1 | ✅ |
| `chapters` | ✓ | 2 | ✅ |
| `coin_transactions` | ✓ | 1 | — |
| `content_embeddings` | ✓ | 1 | — |
| `daily_checkins` | ✓ | 1 | — |
| `daily_quests` | ✓ | 3 | ✅ |
| `daily_quiz_attempts` | ✓ | 1 | ✅ |
| `email_campaigns` | ✓ | 1 | ✅ |
| `email_recipients` | ✓ | 1 | ✅ |
| `email_subscriptions` | ✓ | 3 | 🟡 無 CHECK |
| `env_change_requests` | ✓ | 3 | ✅ |
| `error_logs` | ✓ | 1 | ✅ |
| `forum_boards` | ✓ | 1 | — |
| `forum_reactions` | ✓ | 2 | ✅ |
| `forum_replies` | ✓ | 3 | ✅ |
| `forum_reply_likes` | ✓ | 2 | ✅ |
| `forum_threads` | ✓ | 2 | ✅ |
| `gamification_rules` | ✓ | 4 | ✅ |
| `gdpr_requests` | ✓ | 3 | ✅ |
| `learning_events` | ✓ | 2 | ✅ |
| `learning_plans` | ✓ | 2 | ✅ |
| `leetcode_problems` | ✓ | 2 | ✅ |
| `leetcode_questions` | ✓ | 2 | ✅ |
| `lesson_progress` | ✓ | 1 | 🟡 無 CHECK |
| `lessons` | ✓ | 2 | ✅ |
| `media_assets` | ✓ | 3 | ✅ |
| `notes` | ✓ | 2 | 🟡 無 CHECK |
| `notification_settings` | ✓ | 1 | ✅ |
| `notifications` | ✓ | 4 | ✅ |
| `orders` | ✓ | 1 | — |
| `pet_messages` | ✓ | 1 | 🟡 無 CHECK |
| `pets` | ✓ | 1 | 🟡 無 CHECK |
| `playgrounds` | ✓ | 1 | 🟡 無 CHECK |
| `portfolios` | ✓ | 3 | ✅ |
| `profiles` | ✓ | 2 | — |
| `quiz_attempts` | ✓ | 1 | 🟡 無 CHECK |
| `rate_limit_hits` | ✓ | 1 | — |
| `rate_limit_rules` | ✓ | 1 | ✅ |
| `referral_codes` | ✓ | 2 | ✅ |
| `referral_commissions` | ✓ | 2 | ✅ |
| `referrals` | ✓ | 2 | ✅ |
| `seo_pages` | ✓ | 0 | 🔴 空 |
| `seo_redirects` | ✓ | 0 | 🔴 空 |
| `submissions` | ✓ | 2 | ✅ |
| `subscriptions` | ✓ | 1 | — |
| `ticket_messages` | ✓ | 4 | ✅ |
| `tickets` | ✓ | 5 | ✅ |
| `todos` | ✓ | 1 | ✅ |
| `user_achievements` | ✓ | 1 | 🟡 無 CHECK |
| `user_api_keys` | ✓ | 1 | 🟡 無 CHECK |
| `user_blog_articles` | ✓ | 2 | ✅ |
| `user_blog_settings` | ✓ | 2 | ✅ |
| `user_leetcode_solved` | ✓ | 3 | ✅ |
| `user_reports` | ✓ | 3 | ✅ |
| `user_segments` | ✓ | 1 | ✅ |
| `web_vitals` | ✓ | 2 | ✅ |
| `xp_events` | ✓ | 1 | — |
