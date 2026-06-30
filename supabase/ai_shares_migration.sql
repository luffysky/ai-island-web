-- AI 回答分享短連結：把整段 Q&A 存起來、用短 token 分享，
-- 取代原本把全文塞進 query string(?q=…&a=…) 造成的超長百分比編碼亂碼網址。
CREATE TABLE IF NOT EXISTS public.ai_shares (
  token       TEXT PRIMARY KEY,
  persona     TEXT NOT NULL DEFAULT '綠寶',
  question    TEXT NOT NULL DEFAULT '',
  answer      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_shares ENABLE ROW LEVEL SECURITY;
-- 分享本來就是公開內容（落地頁 noindex）；寫入走 server service-role。
DROP POLICY IF EXISTS ai_shares_read ON public.ai_shares;
CREATE POLICY ai_shares_read ON public.ai_shares FOR SELECT USING (true);
