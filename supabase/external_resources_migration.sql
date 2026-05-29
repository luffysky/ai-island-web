-- 學員外部資源庫（書 / YouTube / 部落格 / 課程 / 工具 / 社群 / podcast）
-- /me/resources 頁面用：AI 推薦 + 搜尋 + 精美卡片
-- 內容由 admin / 雪鑰精選 curated、學員只讀
--
-- 跟章節 lesson 對照：lesson 是「課內」、external_resources 是「課外延伸」

CREATE TABLE IF NOT EXISTS public.external_resources (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  short_desc       TEXT NOT NULL,                -- 卡片正面顯示（< 100 字）
  long_desc        TEXT,                         -- 展開時的詳細介紹（含為什麼推薦）
  url              TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('book','youtube','blog','course','tool','community','podcast','newsletter','docs','playground')),
  source           TEXT,                         -- 'MDN' / 'Coursera' / 'Hahow' / '雪鑰精選' / etc.
  tags             TEXT[] DEFAULT '{}',          -- 學員能搜索的 keyword
  topics           TEXT[] DEFAULT '{}',          -- AI 比對用 ['react','typescript','vibe-coding']
  difficulty       TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced','all')),
  language         TEXT DEFAULT 'en',            -- 'zh' / 'en' / 'jp'
  image_url        TEXT,                         -- 縮圖（可空、空就用 type emoji）
  is_free          BOOLEAN DEFAULT true,
  curated_by       TEXT DEFAULT 'admin',         -- 'xueyue' = 雪鑰精選（會多一個徽章）
  position         INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_res_type ON public.external_resources(type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_ext_res_topics ON public.external_resources USING gin(topics) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_ext_res_tags ON public.external_resources USING gin(tags) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_ext_res_difficulty ON public.external_resources(difficulty) WHERE active = true;

-- updated_at auto trigger
CREATE OR REPLACE FUNCTION public.set_external_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_external_resources_updated ON public.external_resources;
CREATE TRIGGER trg_external_resources_updated
  BEFORE UPDATE ON public.external_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_external_resources_updated_at();

-- RLS: 所有登入 user 都能讀、admin 才能寫
ALTER TABLE public.external_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_resources_read ON public.external_resources;
CREATE POLICY external_resources_read ON public.external_resources
  FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS external_resources_admin_write ON public.external_resources;
CREATE POLICY external_resources_admin_write ON public.external_resources
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                                              AND (p.role IN ('admin','owner') OR p.is_owner = true))
  );
