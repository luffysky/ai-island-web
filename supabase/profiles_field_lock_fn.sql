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
$fnbody$
