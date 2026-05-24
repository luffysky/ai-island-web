-- 圖片 / 媒體上傳資產
-- 所有 user 上傳的圖片都記在這、之後可審計 / 刪 / 限制單人配額

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  url text NOT NULL,
  filename text,
  mime_type text,
  size_bytes bigint,
  folder text,                 -- avatar / blog / forum / comment / ai-attach / social / etc
  width int,
  height int,
  deleted_at timestamptz,      -- soft delete、保留 audit
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_user_created
  ON public.media_assets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_folder
  ON public.media_assets (folder);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- user 自己可讀自己的、admin 可讀全部
DROP POLICY IF EXISTS media_read ON public.media_assets;
CREATE POLICY media_read ON public.media_assets FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- user 只能寫自己的
DROP POLICY IF EXISTS media_insert ON public.media_assets;
CREATE POLICY media_insert ON public.media_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- soft delete: user 改自己的 deleted_at、admin 改任何人的
DROP POLICY IF EXISTS media_update ON public.media_assets;
CREATE POLICY media_update ON public.media_assets FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.media_assets IS '所有 user 上傳到 R2 的圖片資產、可審計 / 配額 / soft delete';
COMMENT ON COLUMN public.media_assets.folder IS 'R2 folder prefix：avatar / blog / forum / comment / ai-attach / etc';
