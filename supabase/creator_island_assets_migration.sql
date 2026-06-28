-- Creator Island M1 — Assets（在 workspace migration 之後跑）
-- ci_fragments / works / work_fragments / asset_relations(+多型 trigger) / asset_versions / packages / collections
-- 依 docs/ideas_os/05_ASSET_SYSTEM.md、13_DATABASE.md。冪等。

CREATE EXTENSION IF NOT EXISTS vector;

-- ============ ci_fragments ============
CREATE TABLE IF NOT EXISTS public.ci_fragments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content      TEXT NOT NULL DEFAULT '',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  mood         TEXT,
  category     TEXT,
  source_type  TEXT NOT NULL DEFAULT 'human_original'
    CHECK (source_type IN ('human_original','ai_generated','ai_assisted','human_selected','work_recycled','egg_generated','market_imported','transcreated')),
  ai_summary   TEXT,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_fragments_ws ON public.ci_fragments(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ci_fragments_tags ON public.ci_fragments USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_ci_fragments_embedding ON public.ci_fragments USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============ ci_works ============
CREATE TABLE IF NOT EXISTS public.ci_works (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_type        TEXT NOT NULL DEFAULT 'article'
    CHECK (work_type IN ('song','article','story','script','product_plan','course','worldbuilding','other')),
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','done','archived')),
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body             TEXT NOT NULL DEFAULT '',
  meta             JSONB NOT NULL DEFAULT '{}'::jsonb,   -- song mode: {lyricsSectioned, sunoPrompt, mvPrompt}
  source_type      TEXT NOT NULL DEFAULT 'human_original',
  language         TEXT,
  culture          TEXT,
  published_blog_id UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_works_ws ON public.ci_works(workspace_id, updated_at DESC);

-- ============ ci_work_fragments（canonical composition）============
CREATE TABLE IF NOT EXISTS public.ci_work_fragments (
  id          BIGSERIAL PRIMARY KEY,
  work_id     UUID NOT NULL REFERENCES public.ci_works(id) ON DELETE CASCADE,
  fragment_id UUID NOT NULL REFERENCES public.ci_fragments(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_work_fragments ON public.ci_work_fragments(work_id, fragment_id);

-- ============ ci_asset_relations（canonical derivation lineage；多型 id、無跨表 FK）============
CREATE TABLE IF NOT EXISTS public.ci_asset_relations (
  id              BIGSERIAL PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  from_asset_id   UUID NOT NULL,
  from_asset_type TEXT NOT NULL CHECK (from_asset_type IN ('fragment','work','package','collection','workflow')),
  to_asset_id     UUID NOT NULL,
  to_asset_type   TEXT NOT NULL CHECK (to_asset_type IN ('fragment','work','package','collection','workflow')),
  relation_type   TEXT NOT NULL
    CHECK (relation_type IN ('evolved_from','condensed_from','recycled_from','transcreated_from','inspired_by','remixed_from','forked_from','quoted_by','packaged_in')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_relations_from ON public.ci_asset_relations(from_asset_id);
CREATE INDEX IF NOT EXISTS idx_ci_relations_to ON public.ci_asset_relations(to_asset_id);

-- 多型完整性：驗證被引用的 asset 真的存在（已知型別；未知型別放行、forward-compat）
CREATE OR REPLACE FUNCTION public.ci_validate_asset_ref(p_id uuid, p_type text)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE v_exists boolean;
BEGIN
  IF p_type = 'fragment' THEN SELECT EXISTS(SELECT 1 FROM public.ci_fragments WHERE id=p_id) INTO v_exists;
  ELSIF p_type = 'work' THEN SELECT EXISTS(SELECT 1 FROM public.ci_works WHERE id=p_id) INTO v_exists;
  ELSIF p_type = 'package' THEN SELECT EXISTS(SELECT 1 FROM public.ci_packages WHERE id=p_id) INTO v_exists;
  ELSIF p_type = 'collection' THEN SELECT EXISTS(SELECT 1 FROM public.ci_collections WHERE id=p_id) INTO v_exists;
  ELSE v_exists := true; -- workflow 等尚未建表 → 放行
  END IF;
  RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_asset_relations_check()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.ci_validate_asset_ref(NEW.from_asset_id, NEW.from_asset_type) THEN
    RAISE EXCEPTION 'from_asset % (%s) 不存在', NEW.from_asset_id, NEW.from_asset_type;
  END IF;
  IF NOT public.ci_validate_asset_ref(NEW.to_asset_id, NEW.to_asset_type) THEN
    RAISE EXCEPTION 'to_asset % (%s) 不存在', NEW.to_asset_id, NEW.to_asset_type;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ci_asset_relations_check ON public.ci_asset_relations;
CREATE TRIGGER trg_ci_asset_relations_check
  BEFORE INSERT OR UPDATE ON public.ci_asset_relations
  FOR EACH ROW EXECUTE FUNCTION public.ci_asset_relations_check();

-- ============ ci_asset_versions ============
CREATE TABLE IF NOT EXISTS public.ci_asset_versions (
  id           BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  asset_id     UUID NOT NULL,
  asset_type   TEXT NOT NULL,
  version_no   INTEGER NOT NULL,
  snapshot     JSONB NOT NULL,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_versions_asset ON public.ci_asset_versions(asset_id, created_at DESC);

-- ============ ci_packages ============
CREATE TABLE IF NOT EXISTS public.ci_packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  TEXT NOT NULL DEFAULT '',
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility   TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','workspace','public','marketplace')),
  license_id   UUID,
  price_z      INTEGER NOT NULL DEFAULT 0 CHECK (price_z >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_packages_ws ON public.ci_packages(workspace_id);

-- ============ ci_collections / ci_collection_items ============
CREATE TABLE IF NOT EXISTS public.ci_collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ci_collection_items (
  id            BIGSERIAL PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.ci_collections(id) ON DELETE CASCADE,
  asset_id      UUID NOT NULL,
  asset_type    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_collection_items ON public.ci_collection_items(collection_id, asset_id);

-- ============ RLS（workspace-scoped 讀；寫走 service-role）============
ALTER TABLE public.ci_fragments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_works            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_work_fragments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_asset_relations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_asset_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_packages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ci_fragments_read ON public.ci_fragments;
CREATE POLICY ci_fragments_read ON public.ci_fragments FOR SELECT USING (public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_works_read ON public.ci_works;
CREATE POLICY ci_works_read ON public.ci_works FOR SELECT USING (public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_work_fragments_read ON public.ci_work_fragments;
CREATE POLICY ci_work_fragments_read ON public.ci_work_fragments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ci_works w WHERE w.id = work_id AND public.ci_is_workspace_member(w.workspace_id)));
DROP POLICY IF EXISTS ci_relations_read ON public.ci_asset_relations;
CREATE POLICY ci_relations_read ON public.ci_asset_relations FOR SELECT USING (public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_versions_read ON public.ci_asset_versions;
CREATE POLICY ci_versions_read ON public.ci_asset_versions FOR SELECT USING (public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_packages_read ON public.ci_packages;
CREATE POLICY ci_packages_read ON public.ci_packages FOR SELECT
  USING (visibility IN ('public','marketplace') OR public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_collections_read ON public.ci_collections;
CREATE POLICY ci_collections_read ON public.ci_collections FOR SELECT USING (public.ci_is_workspace_member(workspace_id));
DROP POLICY IF EXISTS ci_collection_items_read ON public.ci_collection_items;
CREATE POLICY ci_collection_items_read ON public.ci_collection_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ci_collections c WHERE c.id = collection_id AND public.ci_is_workspace_member(c.workspace_id)));
