-- Creator Island / Store — Z 幣兌換（redeem）
-- 兩類真實效果：ai_credit（Z幣→工作室 wallet，餵 Cost Manager）、cosmetic（裝飾/稱號，顯示在創作者島）。
-- 章節解鎖/測驗次數/寵物造型/XP加倍 等需先建各自底層系統，暫不硬接。

-- 兌換紀錄（每次花 Z 幣的帳）
CREATE TABLE IF NOT EXISTS public.ci_store_purchases (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id    TEXT NOT NULL,
  qty        INTEGER NOT NULL DEFAULT 1,
  z_spent    INTEGER NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_store_purchases_user ON public.ci_store_purchases(user_id, id DESC);
ALTER TABLE public.ci_store_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_store_purchases_own ON public.ci_store_purchases;
CREATE POLICY ci_store_purchases_own ON public.ci_store_purchases FOR SELECT USING (user_id = auth.uid());

-- 擁有的裝飾（頭像框/名稱顏色/稱號）+ 是否裝備中
CREATE TABLE IF NOT EXISTS public.ci_user_cosmetics (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id   TEXT NOT NULL,
  cosmetic_type TEXT NOT NULL CHECK (cosmetic_type IN ('title','name_color','avatar_frame')),
  value         TEXT NOT NULL,
  equipped      BOOLEAN NOT NULL DEFAULT false,
  acquired_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, cosmetic_id)
);
CREATE INDEX IF NOT EXISTS idx_ci_user_cosmetics_user ON public.ci_user_cosmetics(user_id);
ALTER TABLE public.ci_user_cosmetics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_user_cosmetics_own ON public.ci_user_cosmetics;
CREATE POLICY ci_user_cosmetics_own ON public.ci_user_cosmetics FOR SELECT USING (user_id = auth.uid());
