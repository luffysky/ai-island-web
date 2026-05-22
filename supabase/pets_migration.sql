-- AI 寵物伴讀 schema（方案 B PR 1）
-- 寵物實例 + 對話紀錄。每位用戶最多一隻寵物（unique on user_id）。

CREATE TABLE IF NOT EXISTS public.pets (
  user_id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL DEFAULT '招財',
  species              TEXT NOT NULL DEFAULT 'hamster',
  level                INT  NOT NULL DEFAULT 1,
  affinity             INT  NOT NULL DEFAULT 0,
  mood                 TEXT NOT NULL DEFAULT 'idle',
  proactive_enabled    BOOLEAN NOT NULL DEFAULT true,
  walk_enabled         BOOLEAN NOT NULL DEFAULT true,
  last_interacted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  memory_summary       TEXT NOT NULL DEFAULT '',
  preferences          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pets_own_all ON public.pets;
CREATE POLICY pets_own_all ON public.pets
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pet_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  context    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_messages_user ON public.pet_messages(user_id, created_at DESC);

ALTER TABLE public.pet_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pet_messages_own ON public.pet_messages;
CREATE POLICY pet_messages_own ON public.pet_messages
  FOR ALL USING (auth.uid() = user_id);
