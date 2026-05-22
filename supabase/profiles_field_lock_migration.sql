-- Security hardening for public.profiles.
--
-- Problem: profiles_update_own policy allows USING (auth.uid() = id)
-- but has no WITH CHECK clause, so any authenticated user could
-- previously call
--   UPDATE profiles SET role='admin' WHERE id = auth.uid()
-- and self-promote. Same for ai_unlimited, banned_at, ban_reason,
-- and gamification fields (xp / level / z_coin / streak_days / hearts).
--
-- Fix: BEFORE UPDATE trigger that resets these fields back to OLD
-- when the connection is anon or authenticated. Service role and any
-- SECURITY DEFINER function are unaffected — that's how admin API
-- routes, RPCs, and gamification triggers continue to work.

CREATE OR REPLACE FUNCTION public.profiles_field_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fnbody$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.role             := OLD.role;
    NEW.ai_unlimited     := OLD.ai_unlimited;
    NEW.ai_unlimited_at  := OLD.ai_unlimited_at;
    NEW.ai_unlimited_by  := OLD.ai_unlimited_by;
    NEW.banned_at        := OLD.banned_at;
    NEW.ban_reason       := OLD.ban_reason;
    NEW.xp               := OLD.xp;
    NEW.level            := OLD.level;
    NEW.z_coin           := OLD.z_coin;
    NEW.streak_days      := OLD.streak_days;
    NEW.hearts           := OLD.hearts;
    NEW.last_active_at   := OLD.last_active_at;
  END IF;
  RETURN NEW;
END;
$fnbody$;

DROP TRIGGER IF EXISTS profiles_field_lock_trigger ON public.profiles;
CREATE TRIGGER profiles_field_lock_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_field_lock();
