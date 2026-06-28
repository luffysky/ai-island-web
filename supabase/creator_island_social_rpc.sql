-- 原子調整 ci_posts 計數欄（likes_count/comments_count/views_count）。冪等。
CREATE OR REPLACE FUNCTION public.ci_bump_post_count(p_post UUID, p_col TEXT, p_delta INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_col NOT IN ('likes_count','comments_count','views_count') THEN RETURN; END IF;
  EXECUTE format('UPDATE public.ci_posts SET %I = GREATEST(%I + $1, 0) WHERE id = $2', p_col, p_col) USING p_delta, p_post;
END;
$$;
