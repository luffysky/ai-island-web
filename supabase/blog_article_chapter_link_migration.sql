-- 2026-07 — 部落格文章關聯課程章節/課（可點跳到該 lesson）。
-- 由「筆記發布成部落格」時帶入 note.chapter_id / note.lesson_id；也可後台手動設。
-- 都可為 null（一般部落格文章不一定跟課程相關）。
alter table public.user_blog_articles
  add column if not exists chapter_id integer,
  add column if not exists lesson_id text;
