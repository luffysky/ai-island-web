-- 邀請碼帶預設權限（加入者套用此角色）。冪等、重跑安全
alter table public.note_invites add column if not exists role text default 'editor';
