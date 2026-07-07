-- 部落格發文身份：owner/admin/客服 可用官方身份發文（顯示為 官方/管理員/客服）。
-- 文章仍歸原作者(user_id)、可自己編輯；只是顯示層換名字 + 徽章。
alter table public.user_blog_articles
  add column if not exists author_identity text not null default 'self';
