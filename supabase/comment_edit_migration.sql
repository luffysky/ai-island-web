-- 留言/回覆「編輯」功能：補 updated_at 欄位，記錄本人編輯時間
-- 冪等：重跑安全（IF NOT EXISTS）。跑法：貼進 Supabase SQL editor 執行。

-- 討論區回覆
ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 部落格留言
ALTER TABLE public.blog_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 說明：
--   updated_at 為 NULL = 從未編輯過；有值 = 最後一次本人編輯時間。
--   前端據此顯示「（已編輯）」標記。內容更新由 API PATCH 寫入（限本人）。
