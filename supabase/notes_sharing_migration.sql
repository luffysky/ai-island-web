-- 共同筆記：邀請碼 + 協作者（冪等、重跑安全）

-- 協作者（被邀請進來一起編輯的人）
create table if not exists public.note_collaborators (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor',
  added_at timestamptz default now(),
  primary key (note_id, user_id)
);
create index if not exists note_collab_user_idx on public.note_collaborators(user_id);

-- 邀請碼
create table if not exists public.note_invites (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  code text unique not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked boolean default false,
  created_at timestamptz default now()
);
create index if not exists note_invites_code_idx on public.note_invites(code);

-- SECURITY DEFINER helper：在 notes 政策裡查協作者，繞過 note_collaborators 的 RLS
-- 避免「notes 政策 → note_collaborators 政策 → notes 政策」無限遞迴
create or replace function public.is_note_collaborator(p_note uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.note_collaborators where note_id = p_note and user_id = p_user);
$$;

-- 只有「editor」角色（非 viewer）才算有編輯權
create or replace function public.is_note_editor(p_note uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.note_collaborators
    where note_id = p_note and user_id = p_user and role = 'editor'
  );
$$;

alter table public.note_collaborators enable row level security;
alter table public.note_invites enable row level security;

-- 協作者列：自己是協作者、或自己是該筆記擁有者 → 可讀；同條件可刪（退出 / 移除）
drop policy if exists nc_select on public.note_collaborators;
create policy nc_select on public.note_collaborators for select using (
  user_id = auth.uid()
  or exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
drop policy if exists nc_delete on public.note_collaborators;
create policy nc_delete on public.note_collaborators for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);

-- 邀請碼：擁有者看得到自己發的（redeem 走 service-role、不靠這條）
drop policy if exists ni_owner on public.note_invites;
create policy ni_owner on public.note_invites for select using (created_by = auth.uid());

-- notes：協作者可讀、可改（additive，不動既有 owner 政策；用 definer 函式避免遞迴）
drop policy if exists notes_select_shared on public.notes;
create policy notes_select_shared on public.notes for select using (
  public.is_note_collaborator(notes.id, auth.uid())
);
drop policy if exists notes_update_shared on public.notes;
create policy notes_update_shared on public.notes for update using (
  public.is_note_editor(notes.id, auth.uid())
) with check (
  public.is_note_editor(notes.id, auth.uid())
);
