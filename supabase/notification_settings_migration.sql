-- ============================================================
-- 全站通知事件 × channel 矩陣
-- 給 admin 在 /admin/notifications 一鍵控制：哪個事件走哪個 channel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
  event_key   TEXT PRIMARY KEY,
  label_zh    TEXT NOT NULL,
  description TEXT,
  category    TEXT,  -- 'security' / 'learning' / 'commerce' / 'social' / 'system'
  channels    JSONB NOT NULL DEFAULT '{"in_app":true,"email":false,"line":false,"push":false}'::jsonb,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  is_v1       BOOLEAN DEFAULT TRUE,    -- v1 已實際接上 / v2 規劃中
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_settings_category ON public.notification_settings(category);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_notification_settings" ON public.notification_settings;
CREATE POLICY "admin_all_notification_settings" ON public.notification_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- seed 11 個 event 預設值（已盤點的事件）
INSERT INTO public.notification_settings (event_key, label_zh, description, category, channels, is_v1) VALUES
  -- 系統 / 客服
  ('ticket_reply',         '客服回覆 ticket',         'admin 在 CRM 回覆 ticket 時、推給 user',                'system',   '{"in_app":true,"email":false,"line":true,"push":false}',  true),
  ('system_broadcast',     '系統公告 / 維護',          'admin 主動發的公告（維護、活動）',                       'system',   '{"in_app":true,"email":true,"line":true,"push":false}',    true),
  ('abnormal_login',       '異常登入警示',            '不同國家 / 裝置登入時提醒',                              'security', '{"in_app":true,"email":true,"line":true,"push":false}',    false),

  -- 學習
  ('level_up',             '升等 / 段位提升',          '玩家 XP 升等、或段位提升',                              'learning', '{"in_app":true,"email":false,"line":false,"push":false}',  true),
  ('achievement_unlocked', '成就解鎖',                '解鎖任何成就時',                                        'learning', '{"in_app":true,"email":false,"line":false,"push":false}',  true),
  ('new_content',          '新章節 / 新副本 / 新部落格', '管理員發新內容時、通知有興趣的 user',                   'learning', '{"in_app":true,"email":true,"line":false,"push":false}',   true),
  ('daily_streak',         '每日學習提醒',             '每天 22:00、提醒沒簽到 / 連續中斷',                     'learning', '{"in_app":false,"email":false,"line":true,"push":false}',  false),
  ('chapter_inactive',     '章節停留提醒',             '同章節停留超過 3 天、推一下',                            'learning', '{"in_app":true,"email":false,"line":true,"push":false}',   false),
  ('competition_result',   '排行榜 / 競賽結果',         '週 / 月排行榜結算、獎勵發放',                            'learning', '{"in_app":true,"email":false,"line":true,"push":false}',   false),

  -- 商務
  ('zcoin_grant',          'Z-coin 補發 / Airdrop',   'admin 補發 / 系統 airdrop、user 收到時',                'commerce', '{"in_app":true,"email":false,"line":false,"push":false}',  true),
  ('subscription_billing', '訂閱付款 / 過期',           '付款成功 / 失敗 / 即將到期',                            'commerce', '{"in_app":true,"email":true,"line":false,"push":false}',   true),

  -- 社群
  ('mention',              '@ 或留言被回',             '論壇 / 部落格留言被回覆 / 被 @',                         'social',   '{"in_app":true,"email":false,"line":false,"push":false}',  true)
ON CONFLICT (event_key) DO NOTHING;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_notification_settings_trigger ON public.notification_settings;
CREATE TRIGGER touch_notification_settings_trigger
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_notification_settings();
