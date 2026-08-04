-- 2.8.3 client-action 中繼：agent_tasks 加 client_actions jsonb + 兩支原子 RPC。
-- 冪等：可重跑。client-action＝navigate_internal / open_url 的信封，前端執行後回報狀態。

alter table agent_tasks
  add column if not exists client_actions jsonb not null default '[]'::jsonb;

-- append：單條 row-lock UPDATE，jsonb || 串接。並行 append 各自在行鎖下重讀當前值→兩筆都保留、不遺失。
create or replace function agent_client_action_append(
  p_task_id uuid, p_user_id uuid, p_action jsonb
) returns jsonb
language sql
as $$
  update agent_tasks
     set client_actions = coalesce(client_actions, '[]'::jsonb) || p_action
   where id = p_task_id and user_id = p_user_id
  returning client_actions;
$$;

-- 狀態更新：jsonb_agg 重映射指定 id 的元素；已是終態（completed/failed/cancelled）不再覆寫＝冪等。
-- 單條語句原子；p_ts_field 決定寫哪個時間戳（acknowledgedAt / completedAt）。
create or replace function agent_client_action_update(
  p_task_id uuid, p_user_id uuid, p_action_id text,
  p_status text, p_error text, p_ts_field text
) returns jsonb
language sql
as $$
  update agent_tasks
     set client_actions = (
       select coalesce(jsonb_agg(
         case
           when elem->>'id' = p_action_id
             and (elem->>'status') not in ('completed','cancelled')
           then elem
                || jsonb_build_object('status', p_status)
                || (case when p_error is not null then jsonb_build_object('error', p_error) else '{}'::jsonb end)
                || (case when p_ts_field is not null
                         then jsonb_build_object(p_ts_field, to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
                         else '{}'::jsonb end)
           else elem
         end
         order by ord
       ), '[]'::jsonb)
       from jsonb_array_elements(coalesce(client_actions, '[]'::jsonb)) with ordinality as t(elem, ord)
     )
   where id = p_task_id and user_id = p_user_id
  returning client_actions;
$$;
