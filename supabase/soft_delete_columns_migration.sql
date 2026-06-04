-- 軟刪除欄位（embeddings reindex / sitemap 會用 .is("deleted_at", null) 過濾、之前漏建）
alter table public.forum_threads add column if not exists deleted_at timestamptz;
alter table public.user_blog_articles add column if not exists deleted_at timestamptz;
