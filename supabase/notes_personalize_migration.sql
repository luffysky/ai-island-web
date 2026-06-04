-- 筆記個人化：便利貼顏色 / 透明度 / 排序
-- 全部冪等（IF NOT EXISTS）、重跑安全
alter table public.notes add column if not exists color text;            -- 便利貼配色 key（pink/yellow/green/blue/purple/orange）；null = 依雜湊自動
alter table public.notes add column if not exists opacity real default 1; -- 便利貼透明度 0.3–1
alter table public.notes add column if not exists sort_order int;         -- 我的筆記頁拖移排序（小在前）

-- 既有筆記給一個初始 sort_order（依更新時間，新的在前 = 小 sort_order）
with ranked as (
  select id, row_number() over (partition by user_id order by updated_at desc) - 1 as rn
  from public.notes
  where sort_order is null
)
update public.notes n
set sort_order = ranked.rn
from ranked
where n.id = ranked.id;

create index if not exists notes_user_sort_idx on public.notes (user_id, sort_order);
