-- 討論區留言數自動維護（修「加了留言但 reply_count 不變」）。
-- 之前 forum_data_honesty_migration 只做「一次性對齊」、沒有 trigger → 新增/刪除回覆後 drift。
-- 這支加 AFTER INSERT/DELETE trigger 自動同步 forum_threads.reply_count，並再對齊一次現有 drift。
-- 冪等、加法。跑法：node scripts/run-sql.mjs supabase/forum_reply_count_trigger.sql

CREATE OR REPLACE FUNCTION public.sync_forum_reply_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
      SET reply_count = COALESCE(reply_count, 0) + 1
      WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
      SET reply_count = GREATEST(0, COALESCE(reply_count, 0) - 1)
      WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_reply_count ON public.forum_replies;
CREATE TRIGGER trg_forum_reply_count
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_reply_count();

-- 順帶再對齊一次現有 drift（把所有串的 reply_count 校成真實列數）
UPDATE public.forum_threads t
SET reply_count = COALESCE((SELECT COUNT(*) FROM public.forum_replies r WHERE r.thread_id = t.id), 0)
WHERE t.reply_count IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM public.forum_replies r WHERE r.thread_id = t.id), 0);
