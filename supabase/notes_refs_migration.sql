-- 筆記區塊/頁面引用（Notion 化 L2）
-- note_refs：這則筆記引用了哪些筆記（存 id）。引用只存 id → 來源改標題/內容，引用處永遠顯示最新（改一次全站同步）。
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS note_refs UUID[] NOT NULL DEFAULT '{}';
