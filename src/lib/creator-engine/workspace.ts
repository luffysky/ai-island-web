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

  // E2 種島：放碎片 + 範例作品，島一開始就不空（best-effort）
  await seedSampleFragments((ws as any).id, userId).catch(() => {});
  await seedSampleWorks((ws as any).id, userId).catch(() => {});
  import("@/lib/creator-engine/notify").then((m) => m.notifyIslandAdmin("有新創作者加入島嶼 🎉", `newcreator:${userId}`)).catch(() => {});

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

/** 種兩個範例作品，讓「作品庫」一開始就不空、也示範成品長什麼樣。 */
export async function seedSampleWorks(workspaceId: string, userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const works = [
    {
      title: "範例 · 一首關於回家的歌", work_type: "song", status: "draft",
      body: "[Verse 1]\n最後一班車的玻璃上\n我用指尖寫你的名字\n窗外的城市倒退著\n像所有我沒說出口的話\n\n[Chorus]\n回家的路那麼長\n長到我把自己走丟\n但只要還有一盞燈\n我就還認得回頭的方向",
      meta: { sunoPrompt: "lo-fi mandopop, warm, late-night bus, nostalgic, soft piano + rain texture", mvPrompt: "夜晚公車車窗倒影、城市霓虹後退、暖黃路燈" },
    },
    {
      title: "範例 · 一篇短文：外婆家的米甕", work_type: "article", status: "draft",
      body: "外婆家的廚房有一個比我還高的米甕。\n\n小時候我以為那裡面住著一個世界——每次掀開蓋子，米的香氣像是從很遠的地方飄來。後來才知道，那香氣裡其實藏著外婆每天清晨的手。\n\n她走後，米甕空了。我才第一次發現，原來有些聲音，是要等到再也聽不到，才聽得見的。",
    },
    {
      title: "範例 · 短篇小說：未接來電 7 通", work_type: "短篇小說", status: "draft",
      body: "手機螢幕亮起又暗下，第七通。\n\n他盯著那個名字，像盯著一道自己出的、卻解不開的題。三年前那場爭吵之後，他把她設成了拒接，又在某個喝醉的夜裡偷偷取消——只是再也沒按下回撥。\n\n第八通沒有來。取而代之的是一則簡訊：「我媽走了。她臨走前一直問你。」\n\n他第一次發現，原來世界上最遠的距離，是七通他都聽見、卻假裝沒聽見的鈴聲。",
    },
  ];
  const { data: inserted } = await admin.from("ci_works").insert(
    works.map((w) => ({ workspace_id: workspaceId, created_by: userId, ...w, source_type: "ai_assisted" })),
  ).select("id");
  // 連到幾個碎片（讓「創作家譜」顯示由哪些碎片長成）
  const wks = (inserted as any[]) ?? [];
  const { data: frags } = await admin.from("ci_fragments").select("id").eq("workspace_id", workspaceId).limit(30);
  const fids = ((frags as any[]) ?? []).map((f) => f.id);
  if (fids.length) {
    const links: any[] = [];
    wks.forEach((w, wi) => {
      for (let i = 0; i < 3; i++) { const fid = fids[(wi * 3 + i) % fids.length]; if (fid) links.push({ work_id: w.id, fragment_id: fid, position: i }); }
    });
    if (links.length) await admin.from("ci_work_fragments").insert(links).then(() => {}, () => {});
  }
}

/** 取單一 workspace（給 ws 切換用）。 */
export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_workspaces").select("id, name, type, visibility, owner_id, created_at").eq("id", id).maybeSingle();
  return (data as Workspace) ?? null;
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
