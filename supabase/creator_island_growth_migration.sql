-- Creator Island Phase2 — Growth + E9 Creator DNA。依 12/13 docs。personal-scoped（user_id）。冪等。

CREATE TABLE IF NOT EXISTS public.ci_creator_dna (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  traits      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {imagery[], tone, strengths[], weaknesses[], formats[]}
  confidence  NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_dna_user ON public.ci_creator_dna(user_id);
ALTER TABLE public.ci_creator_dna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_dna_read ON public.ci_creator_dna;
CREATE POLICY ci_dna_read ON public.ci_creator_dna FOR SELECT USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ci_creator_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_xp      INTEGER NOT NULL DEFAULT 0 CHECK (creator_xp >= 0),  -- 與 profiles.xp 分開
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_stats_user ON public.ci_creator_stats(user_id);
ALTER TABLE public.ci_creator_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ci_stats_read ON public.ci_creator_stats;
CREATE POLICY ci_stats_read ON public.ci_creator_stats FOR SELECT USING (user_id = auth.uid());
