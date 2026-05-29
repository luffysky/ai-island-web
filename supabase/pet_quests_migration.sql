-- 寵物每日任務 — 寵物 AI 根據 user 進度生成、完成獎 z 幣 + 親密度
-- 升級 pets：加 daily_quest JSONB 欄存當天任務 + 完成狀態

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS daily_quest JSONB DEFAULT NULL;
-- daily_quest 結構：
-- { "date": "2026-05-29", "title": "...", "description": "...",
--   "category": "lesson|quiz|review|streak|leetcode",
--   "target": 1, "progress": 0, "completed": false,
--   "reward_z": 10, "reward_affinity": 5,
--   "created_at": "...", "completed_at": "..." }
