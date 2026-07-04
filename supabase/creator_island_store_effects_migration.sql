-- 商店兌換品項的底層系統（#89）：通用效果表 + 寵物造型 cosmetic 型別。
-- 效果類：xp_multiplier(限時XP加倍)、early_access(章節搶先)、quiz_credit(額外測驗次數)。
-- 即時效果(補簽卡)不進表、redeem 當下改 profiles.streak_days。
-- 寵物造型走既有 ci_user_cosmetics（擴 CHECK 加 pet_skin）。

CREATE TABLE IF NOT EXISTS public.ci_store_effects (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  effect_type TEXT NOT NULL,               -- xp_multiplier | early_access | quiz_credit
  value       INTEGER NOT NULL DEFAULT 1,  -- 倍率 / 額度
  qty         INTEGER NOT NULL DEFAULT 0,  -- 剩餘次數（consumable，如 quiz_credit）；限時類用 expires_at
  expires_at  TIMESTAMPTZ,                 -- 限時類到期（如 xp_multiplier/early_access）
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_store_effects_user ON public.ci_store_effects(user_id, effect_type);
ALTER TABLE public.ci_store_effects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_store_effects_own ON public.ci_store_effects;
CREATE POLICY ci_store_effects_own ON public.ci_store_effects FOR SELECT USING (user_id = auth.uid());

-- 扣次數 RPC（quiz_credit 用；原子、不可為負）。
CREATE OR REPLACE FUNCTION public.ci_consume_store_effect(p_user uuid, p_type text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint;
BEGIN
  SELECT id INTO v_id FROM public.ci_store_effects
    WHERE user_id = p_user AND effect_type = p_type AND qty > 0
    ORDER BY id LIMIT 1 FOR UPDATE;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.ci_store_effects SET qty = qty - 1 WHERE id = v_id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ci_consume_store_effect(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ci_consume_store_effect(uuid, text) TO service_role;

-- 寵物造型：擴 ci_user_cosmetics 的 cosmetic_type 允許 pet_skin
ALTER TABLE public.ci_user_cosmetics DROP CONSTRAINT IF EXISTS ci_user_cosmetics_cosmetic_type_check;
ALTER TABLE public.ci_user_cosmetics ADD CONSTRAINT ci_user_cosmetics_cosmetic_type_check
  CHECK (cosmetic_type IN ('title','name_color','avatar_frame','pet_skin'));
