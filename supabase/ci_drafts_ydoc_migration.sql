-- 創作引擎草稿 — 即時共編（Yjs）持久化
-- ci_drafts.ydoc：存 base64(Y.encodeStateAsUpdate(doc)) 的 CRDT 快照（TEXT）。
--   用 TEXT/base64（不是 bytea）是因為 PostgREST/supabase-js 讀寫 bytea 要處理 \x hex
--   編碼很囉唆；base64 字串進出乾淨、前端本來就在 base64 傳輸。
--   房間沒人時（late joiner / 冷開）從這裡載入；有人時靠 peer sync-reply 追平。
--   與既有 body（HTML）並存：body 仍是非共編消費者（發佈 / 部落格 / 字數）的權威來源。
-- 冪等：ADD COLUMN IF NOT EXISTS，可重跑。

ALTER TABLE public.ci_drafts
  ADD COLUMN IF NOT EXISTS ydoc TEXT;

-- 記共編快照最後更新時間（除錯 / 之後可做 GC）
ALTER TABLE public.ci_drafts
  ADD COLUMN IF NOT EXISTS ydoc_updated_at TIMESTAMPTZ;
