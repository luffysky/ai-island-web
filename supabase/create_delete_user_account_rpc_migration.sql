-- delete_user_account()  (no args)
-- Caller: src/app/settings/SettingsForm.tsx:76 -> supabase.rpc("delete_user_account")
-- Deletes the CALLING user's own account (scoped to auth.uid()). profiles.id -> auth.users(id) is
-- ON DELETE CASCADE, and every user-owned table FK to profiles.id is ON DELETE CASCADE / SET NULL,
-- so deleting the auth.users row cascades to profiles and all app data (mirrors the gdpr hard-delete
-- profiles.delete() cascade, but also removes the login). SECURITY DEFINER so it can touch auth.users.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'delete_user_account: no authenticated user';
  END IF;

  -- Remove app-owned data first (cascades), then the profile, then the auth user.
  -- profiles delete cascades all CASCADE-FK child rows; deleting auth.users then removes the login.
  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;
