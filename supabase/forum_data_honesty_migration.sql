-- 討論區數據誠實化：清掉 seed 灌進去的「假觀看數」，並把 reply_count 對齊真實留言數。
-- 之後：觀看數純靠 ThreadViewTracker 的真實 per-session 累加；留言數由 trigger 維護。
-- 冪等：可重跑（純 UPDATE）。跑法：貼進 Supabase SQL editor 執行。

-- 1) 觀看數歸零重來
--    seed 硬塞了 486/231/135… 這種假底數、且是「真實累加疊在假底數上」無法分離 → 一律歸零、之後只累加真實流量。
UPDATE public.forum_threads SET view_count = 0 WHERE view_count <> 0;

-- 2) reply_count 對齊實際留言列數（含巢狀回覆），修正任何 drift
UPDATE public.forum_threads t
SET reply_count = COALESCE(c.n, 0)
FROM (
  SELECT thread_id, COUNT(*)::int AS n
  FROM public.forum_replies
  GROUP BY thread_id
) c
WHERE c.thread_id = t.id
  AND t.reply_count IS DISTINCT FROM COALESCE(c.n, 0);

-- 3) 完全沒有留言的串 → reply_count 歸零
UPDATE public.forum_threads t
SET reply_count = 0
WHERE reply_count <> 0
  AND NOT EXISTS (SELECT 1 FROM public.forum_replies r WHERE r.thread_id = t.id);
