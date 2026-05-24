-- 加島嶼開關 flag（預設關閉、林董手動開）
INSERT INTO public.app_settings(key, value, description) VALUES
  ('island_enabled', 'false'::jsonb, 'AI 島嶼是否對外開放（false 時 /island 顯示維護中、首頁入口隱藏）')
ON CONFLICT (key) DO NOTHING;
