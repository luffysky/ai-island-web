-- P4-02 章節版本記錄 + diff
--
-- 每次 admin 編輯章節時、把舊版 JSON snapshot 存進 chapter_versions。
-- admin 可在後台查看歷史、diff、回滾。
--
-- 注意：本表只存 snapshot。前台讀 lesson 仍走 file system / src/data/chapters/。
-- 完整 DB-backed 章節（P4-01 full）為下一階段、與本表不衝突。

CREATE TABLE IF NOT EXISTS public.chapter_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      INTEGER NOT NULL,
  version         INTEGER NOT NULL,                    -- 第 N 版（每個 chapter_id 內遞增）
  content         JSONB NOT NULL,                       -- 完整章節 JSON snapshot
  byte_size       INTEGER GENERATED ALWAYS AS (octet_length(content::text)) STORED,
  saved_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note            TEXT,                                  -- admin 可寫變更說明（選填）
  UNIQUE (chapter_id, version)
);

CREATE INDEX IF NOT EXISTS idx_chap_ver_chapter ON public.chapter_versions(chapter_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_chap_ver_saved   ON public.chapter_versions(saved_at DESC);

ALTER TABLE public.chapter_versions ENABLE ROW LEVEL SECURITY;

-- admin 才能看 / 改
DROP POLICY IF EXISTS chap_ver_admin_all ON public.chapter_versions;
CREATE POLICY chap_ver_admin_all ON public.chapter_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 取下一個 version 號碼
CREATE OR REPLACE FUNCTION public.next_chapter_version(p_chapter_id INTEGER)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COALESCE(MAX(version), 0) + 1
  FROM public.chapter_versions
  WHERE chapter_id = p_chapter_id;
$$;

GRANT EXECUTE ON FUNCTION public.next_chapter_version(INTEGER) TO authenticated;
