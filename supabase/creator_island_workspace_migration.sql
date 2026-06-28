-- Creator Island M0 — Workspace foundation
-- 依 docs/ideas_os/13_DATABASE.md（ci_ 前綴、workspace-first、RLS）。
-- 既有平台表不動；本檔只新增 ci_* 表。冪等（IF NOT EXISTS / DROP POLICY IF EXISTS）。

-- ============ ci_workspaces ============
CREATE TABLE IF NOT EXISTS public.ci_workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  type        TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal','studio')),
  visibility  TEXT NOT NULL DEFAULT 'private',
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_workspaces_owner ON public.ci_workspaces(owner_id);
-- 一人最多一個 Personal Workspace
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_workspaces_personal
  ON public.ci_workspaces(owner_id) WHERE type = 'personal';

-- ============ ci_workspace_members ============
CREATE TABLE IF NOT EXISTS public.ci_workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner','manager','contributor','viewer')),
  invited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_members_ws_user ON public.ci_workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ci_members_user ON public.ci_workspace_members(user_id);
-- 每個 workspace 剛好一個 owner（≤1 由此保證；≥1 由 transfer RPC / app 保證）
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_members_one_owner
  ON public.ci_workspace_members(workspace_id) WHERE role = 'owner';

-- ============ ci_workspace_invitations ============
CREATE TABLE IF NOT EXISTS public.ci_workspace_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  code_hash    TEXT NOT NULL,                 -- 存 hash、不存明碼
  role         TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('manager','contributor','viewer')),
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ,
  max_uses     INTEGER NOT NULL DEFAULT 1,
  used_count   INTEGER NOT NULL DEFAULT 0,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_invitations_code ON public.ci_workspace_invitations(code_hash);
CREATE INDEX IF NOT EXISTS idx_ci_invitations_ws ON public.ci_workspace_invitations(workspace_id);

-- ============ ci_workspace_wallet ============
CREATE TABLE IF NOT EXISTS public.ci_workspace_wallet (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  balance              INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),  -- Z 幣（同單位、共享額度）
  low_balance_threshold INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_wallet_ws ON public.ci_workspace_wallet(workspace_id);

-- ============ ci_workspace_wallet_tx（append-only ledger）============
CREATE TABLE IF NOT EXISTS public.ci_workspace_wallet_tx (
  id            BIGSERIAL PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount        INTEGER NOT NULL,             -- 正=入、負=出
  balance_after INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ci_wallet_tx_ws ON public.ci_workspace_wallet_tx(workspace_id, created_at DESC);

-- ============ ci_workspace_ai_settings ============
CREATE TABLE IF NOT EXISTS public.ci_workspace_ai_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.ci_workspaces(id) ON DELETE CASCADE,
  monthly_budget  INTEGER NOT NULL DEFAULT 0,         -- Z 幣/月，0=不限（靠個人錢包）
  allowed_agents  TEXT[] NOT NULL DEFAULT ARRAY['synthesize','evolve','compose'],
  model_preference TEXT,
  byok_allowed    BOOLEAN NOT NULL DEFAULT TRUE,
  limits          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ci_ai_settings_ws ON public.ci_workspace_ai_settings(workspace_id);

-- ============ 防遞迴用的 helper（SECURITY DEFINER 繞過 RLS 自我引用；須在 ci_workspace_members 建好之後）============
CREATE OR REPLACE FUNCTION public.ci_is_workspace_member(p_ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ci_workspace_members m
    WHERE m.workspace_id = p_ws AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.ci_workspace_role(p_ws uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.ci_workspace_members m
  WHERE m.workspace_id = p_ws AND m.user_id = auth.uid()
  LIMIT 1;
$$;

-- ============ RLS ============
-- 寫入一律走 server 的 service-role（admin client）+ 程式內權限檢查；
-- 下列 policy 主要是「讀取」backstop：只有 workspace 成員看得到自己的資料。
ALTER TABLE public.ci_workspaces            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_workspace_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_workspace_wallet      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_workspace_wallet_tx   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_workspace_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ci_workspaces_read ON public.ci_workspaces;
CREATE POLICY ci_workspaces_read ON public.ci_workspaces FOR SELECT
  USING (owner_id = auth.uid() OR public.ci_is_workspace_member(id));

DROP POLICY IF EXISTS ci_members_read ON public.ci_workspace_members;
CREATE POLICY ci_members_read ON public.ci_workspace_members FOR SELECT
  USING (user_id = auth.uid() OR public.ci_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS ci_invitations_read ON public.ci_workspace_invitations;
CREATE POLICY ci_invitations_read ON public.ci_workspace_invitations FOR SELECT
  USING (public.ci_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS ci_wallet_read ON public.ci_workspace_wallet;
CREATE POLICY ci_wallet_read ON public.ci_workspace_wallet FOR SELECT
  USING (public.ci_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS ci_wallet_tx_read ON public.ci_workspace_wallet_tx;
CREATE POLICY ci_wallet_tx_read ON public.ci_workspace_wallet_tx FOR SELECT
  USING (public.ci_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS ci_ai_settings_read ON public.ci_workspace_ai_settings;
CREATE POLICY ci_ai_settings_read ON public.ci_workspace_ai_settings FOR SELECT
  USING (public.ci_is_workspace_member(workspace_id));

-- ============ Feature flag（依林董要求預設「開」；之後可在 /admin/settings 關）============
INSERT INTO public.app_settings(key, value, description, category, value_type, is_secret) VALUES
  ('feature_creator_island_enabled', 'true'::jsonb, '創作者島嶼（首頁第三模式 /creator-island）是否啟用', 'feature', 'boolean', false)
ON CONFLICT (key) DO NOTHING;
