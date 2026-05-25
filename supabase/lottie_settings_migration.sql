-- ========================================================================
-- Lottie 全站設定 — 林董到 /admin/app-settings 可改、不用動 code
-- 鍵 / 值都用 app_settings 表既有 schema (key text PK, value jsonb)
-- ========================================================================

-- 確保 app_settings 表存在 (跟舊 migration 對齊)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lottie 8 個用途 key (預設空、林董到 /admin/app-settings 填 URL)
INSERT INTO public.app_settings (key, value, description) VALUES
  ('admin_lottie_url',         'null'::jsonb, '後台整頁背景動畫 URL (.lottie / .json)、建議動漫可愛風'),
  ('admin_lottie_opacity',     '0.12'::jsonb, '後台背景透明度 0-1、預設 0.12'),
  ('home_hero_lottie_url',     'null'::jsonb, '首頁 Hero 區動畫 URL、建議 floating particles / aurora'),
  ('home_hero_lottie_opacity', '0.25'::jsonb, '首頁 Hero 動畫透明度、預設 0.25'),
  ('chapter_hero_lottie_url',  'null'::jsonb, '章節頁頂部裝飾動畫、建議 geometric mesh / code rain'),
  ('empty_state_lottie_url',   'null'::jsonb, '全站空狀態動畫 (沒文章 / 沒收藏)、建議可愛動漫風'),
  ('login_lottie_url',         'null'::jsonb, '登入頁裝飾動畫、建議 island floating / sakura'),
  ('celebration_lottie_url',   'null'::jsonb, '完課 / 解鎖成就慶祝動畫、建議 confetti / 動漫慶祝')
ON CONFLICT (key) DO NOTHING;
