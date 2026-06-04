-- profiles 鏡射 auth email（email-campaigns / TG broadcast 需要、profiles 原本沒 email 欄）
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email
  from auth.users u where u.id = p.id and p.email is distinct from u.email;
-- 之後新註冊 / 改信箱自動同步
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end; $$;
drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();
