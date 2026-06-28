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

  // E2 種島：放幾個示範碎片，島一開始就不空（best-effort）
  await seedSampleFragments((ws as any).id, userId).catch(() => {});

  return ws as Workspace;
}

/** E2 種島：給新工作空間放幾個示範碎片（讓「空島」一開始就有東西玩）。 */
/**
 * 種島：從全站碎片庫 ci_fragment_pool 加權抽 300（SSR 稀有）→ 寫成使用者碎片，
 * 並依 category 建預設分類(Collections) + 歸類。池為空時 fallback 幾個示範碎片。
 */
export async function seedFromPool(workspaceId: string, userId: string, n = 300): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data: drawn } = await admin.rpc("ci_draw_from_pool", { p_n: n, p_ssr: Math.round(n * 0.03), p_sr: Math.round(n * 0.17) });
  let rows = (drawn as any[]) ?? [];
  if (!rows.length) {
    rows = [
      { text: "我墊著腳尖走在妳的世界", category: "靈感", rarity: "R", tags: ["歌詞"] },
      { text: "清晨第一口咖啡的蒸氣，像把昨天的疲憊都蒸散了", category: "靈感", rarity: "R", tags: ["日常"] },
      { text: "小時候那台永遠調不準的收音機，雜訊裡藏著整個夏天", category: "故事種子", rarity: "SR", tags: ["回憶"] },
    ];
  }
  // 寫碎片（rarity 放進 tags 讓卡面看得到）
  const { data: inserted } = await admin.from("ci_fragments").insert(
    rows.map((r) => ({
      workspace_id: workspaceId, created_by: userId,
      title: r.text, category: r.category, tags: [r.rarity, ...(r.tags ?? [])].slice(0, 4), source_type: "egg_generated",
    })),
  ).select("id, category");
  const frags = (inserted as any[]) ?? [];
  // 依 category 建預設分類 + 歸類
  const byCat = new Map<string, string[]>();
  for (const f of frags) { const a = byCat.get(f.category) ?? []; a.push(f.id); byCat.set(f.category, a); }
  for (const [cat, ids] of byCat) {
    if (!cat) continue;
    const { data: col } = await admin.from("ci_collections").insert({ workspace_id: workspaceId, created_by: userId, name: cat }).select("id").single();
    const colId = (col as any)?.id;
    if (colId) await admin.from("ci_collection_items").insert(ids.map((id) => ({ collection_id: colId, asset_id: id, asset_type: "fragment" }))).then(() => {}, () => {});
  }
  return frags.length;
}

async function seedSampleFragments(workspaceId: string, userId: string): Promise<void> {
  await seedFromPool(workspaceId, userId, 300).catch(() => {});
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
