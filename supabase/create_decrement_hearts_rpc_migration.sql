-- decrement_hearts(user_id uuid)
-- Caller: src/lib/gamification.ts:164 -> { user_id }  (NOTE: key is `user_id`, not p_user_id)
-- Subtracts 1 from profiles.hearts, floored at 0. Returns new hearts. SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.decrement_hearts(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new integer;
BEGIN
  IF decrement_hearts.user_id IS NULL THEN
    RAISE EXCEPTION 'decrement_hearts: user_id is null';
  END IF;

  UPDATE profiles
     SET hearts = GREATEST(0, COALESCE(hearts, 0) - 1)
   WHERE id = decrement_hearts.user_id
  RETURNING hearts INTO v_new;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decrement_hearts: profile % not found', decrement_hearts.user_id;
  END IF;

  RETURN v_new;
END;
$$;
