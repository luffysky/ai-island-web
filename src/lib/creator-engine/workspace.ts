/**
 * Creator Engine — Workspace 核心（M0）
 * - 解析 active workspace、首次 lazy-create Personal Workspace
 * - 角色查詢 / 權限判斷
 * 寫入走 service-role（createSupabaseAdmin）+ 程式內權限檢查；RLS 為讀取 backstop。
 * 依 docs/ideas_os/04_WORKSPACE.md、13_DATABASE.md（ci_ 前綴）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";

export type WorkspaceRole = "owner" | "manager" | "contributor" | "viewer";

export type Workspace = {
  id: string;
  name: string;
  type: "personal" | "studio";
  visibility: string;
  owner_id: string;
  created_at: string;
};

const ROLE_RANK: Record<WorkspaceRole, number> = {
  owner: 4,
  manager: 3,
  contributor: 2,
  viewer: 1,
};

/** caller >= min ? */
export function roleAtLeast(role: WorkspaceRole | null, min: WorkspaceRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** 目前登入者（user-session）。null = 未登入。 */
export async function getCurrentUserId(): Promise<string | null> {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return user?.id ?? null;
}

/**
 * 取得（或首次建立）使用者的 Personal Workspace。
 * lazy-create：不在註冊流程、首次進 Creator Island 才建（ADR-008）。
 */
export async function getOrCreatePersonalWorkspace(userId: string): Promise<Workspace> {
  const admin = createSupabaseAdmin();

  const { data: existing } = await admin
    .from("ci_workspaces")
    .select("id, name, type, visibility, owner_id, created_at")
    .eq("owner_id", userId)
    .eq("type", "personal")
    .maybeSingle();
  if (existing) return existing as Workspace;

  // 取個預設名
  const { data: profile } = await admin
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();
  const who = (profile as any)?.display_name || (profile as any)?.username || "我";

  const { data: ws, error } = await admin
    .from("ci_workspaces")
    .insert({ name: `${who} 的工作空間`, type: "personal", owner_id: userId, created_by: userId })
    .select("id, name, type, visibility, owner_id, created_at")
    .single();
  if (error || !ws) throw new Error(`lazy-create personal workspace failed: ${error?.message}`);

  // owner 成員 + 預設子表
  await admin.from("ci_workspace_members").insert({ workspace_id: (ws as any).id, user_id: userId, role: "owner" });
  await admin.from("ci_workspace_wallet").insert({ workspace_id: (ws as any).id, balance: 0 }).then(() => {}, () => {});
  await admin.from("ci_workspace_ai_settings").insert({ workspace_id: (ws as any).id }).then(() => {}, () => {});

  return ws as Workspace;
}

/** M0：active workspace = Personal Workspace（之後支援 cookie 選定）。 */
export async function getActiveWorkspace(userId: string): Promise<Workspace> {
  return getOrCreatePersonalWorkspace(userId);
}

/** 使用者所屬全部 workspace。 */
export async function listWorkspaces(userId: string): Promise<(Workspace & { role: WorkspaceRole })[]> {
  const admin = createSupabaseAdmin();
  const { data: members } = await admin
    .from("ci_workspace_members")
    .select("role, workspace:ci_workspaces(id, name, type, visibility, owner_id, created_at)")
    .eq("user_id", userId);
  return ((members as any[]) ?? [])
    .filter((m) => m.workspace)
    .map((m) => ({ ...(m.workspace as Workspace), role: m.role as WorkspaceRole }));
}

/** caller 在某 workspace 的角色（非成員 = null）。 */
export async function getWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ci_workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return ((data as any)?.role as WorkspaceRole) ?? null;
}

/** 建立 Studio workspace（建立者即 owner）。 */
export async function createStudioWorkspace(userId: string, name: string): Promise<Workspace> {
  const admin = createSupabaseAdmin();
  const { data: ws, error } = await admin
    .from("ci_workspaces")
    .insert({ name, type: "studio", owner_id: userId, created_by: userId })
    .select("id, name, type, visibility, owner_id, created_at")
    .single();
  if (error || !ws) throw new Error(`create studio failed: ${error?.message}`);
  await admin.from("ci_workspace_members").insert({ workspace_id: (ws as any).id, user_id: userId, role: "owner" });
  await admin.from("ci_workspace_wallet").insert({ workspace_id: (ws as any).id, balance: 0 }).then(() => {}, () => {});
  await admin.from("ci_workspace_ai_settings").insert({ workspace_id: (ws as any).id }).then(() => {}, () => {});
  return ws as Workspace;
}
