-- 程式名言 / 工程哲學 / Indie 創業箴言 quote 庫
-- /quote LINE bot 命令隨機抽 1 句、學員清晨 / 通勤打開有感
-- seed 跑 supabase/dev_quotes_seed.sql + scripts/_oneshot-seed-1000-quotes.mjs

CREATE TABLE IF NOT EXISTS public.dev_quotes (
  id BIGSERIAL PRIMARY KEY,
  quote TEXT NOT NULL,                  -- 原文（多半英文、少數中文格言）
  author TEXT,                          -- 出處作者（沒考據出來就 'Unknown' / null）
  translation_zh TEXT,                  -- 中文翻譯
  category TEXT,                        -- 分類：classic / engineering / startup / debug / mindset / 中文格言
  source_url TEXT,                      -- 出處連結（書名 / 演講 / 訪談）
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 隨機抽 1 條用、加 index 加快 ORDER BY random() LIMIT 1
-- 但 supabase-js 不能 ORDER BY random()、用 COUNT + 隨機 OFFSET + RANGE 即可、不用 random index

CREATE INDEX IF NOT EXISTS idx_dev_quotes_active ON public.dev_quotes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dev_quotes_category ON public.dev_quotes(category);
