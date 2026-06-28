CREATE OR REPLACE FUNCTION public.ci_bump_story_views(p_story UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ci_stories SET view_count = view_count + 1 WHERE id = p_story;
$$;
