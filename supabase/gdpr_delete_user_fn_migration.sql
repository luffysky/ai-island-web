-- 2026-07-22 — GDPR 硬刪 RPC：程式（/api/admin/gdpr/[id]/hard-delete）呼叫 delete_user_account_by_id
-- 但 DB 一直沒這個 function（只靠 fallback 刪 profiles、留下 auth.users 帳號＝刪不乾淨）。
-- 補上：刪 profiles（連帶 cascade 掉大部分 app 資料）+ 刪 auth.users（連帶 cascade 掉直接參照 auth 的資料）。
-- security definer 才有權刪 auth schema。冪等（create or replace）、可重跑。
create or replace function public.delete_user_account_by_id(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- 先刪 app 側（profiles 及其下游 cascade）
  delete from public.profiles where id = p_user_id;
  -- 再刪 auth 帳號本身（連帶 cascade 掉直接參照 auth.users 的資料）
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_user_account_by_id(uuid) from public, anon, authenticated;
