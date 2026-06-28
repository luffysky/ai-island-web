-- Creator Island — 全站碎片庫（10000 池，新島從中抽 300）。R/SR/SSR 稀有度。冪等。
CREATE TABLE IF NOT EXISTS public.ci_fragment_pool (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text       TEXT NOT NULL,
  category   TEXT NOT NULL,
  rarity     TEXT NOT NULL DEFAULT 'R' CHECK (rarity IN ('R','SR','SSR')),
  tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 去重：同一句（忽略大小寫/前後空白）只留一筆
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_fragment_pool_text ON public.ci_fragment_pool (lower(btrim(text)));
CREATE INDEX IF NOT EXISTS idx_ci_fragment_pool_rarity ON public.ci_fragment_pool(rarity);
CREATE INDEX IF NOT EXISTS idx_ci_fragment_pool_category ON public.ci_fragment_pool(category);

ALTER TABLE public.ci_fragment_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_fragment_pool_read ON public.ci_fragment_pool;
CREATE POLICY ci_fragment_pool_read ON public.ci_fragment_pool FOR SELECT USING (true);

-- 從池中加權抽樣（SSR 稀有）→ 回傳 n 筆。給「種島」「開蛋」共用。
CREATE OR REPLACE FUNCTION public.ci_draw_from_pool(p_n INT DEFAULT 300, p_ssr INT DEFAULT 10, p_sr INT DEFAULT 50)
RETURNS SETOF public.ci_fragment_pool
LANGUAGE sql STABLE AS $$
  (SELECT * FROM public.ci_fragment_pool WHERE rarity='SSR' ORDER BY random() LIMIT p_ssr)
  UNION ALL
  (SELECT * FROM public.ci_fragment_pool WHERE rarity='SR' ORDER BY random() LIMIT p_sr)
  UNION ALL
  (SELECT * FROM public.ci_fragment_pool WHERE rarity='R' ORDER BY random() LIMIT GREATEST(p_n - p_ssr - p_sr, 0));
$$;
