/**
 * Creator Engine — Memory（M4）
 * scoped 記憶（personal=user_id / workspace=workspace_id）。注入 prompt 時取相關 active 記憶（有上限）。
 * 與既有 user_ai_memory 分開（用途不同）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type MemoryScope = "personal" | "workspace" | "project" | "session";
export type Memory = {
  id: string; scope: MemoryScope; user_id: string | null; workspace_id: string | null;
  kind: string; text: string; confidence: number; status: string; source: string; created_at: string;
};

const COLS = "id, scope, user_id, workspace_id, kind, text, confidence, status, source, created_at";

/** 取要注入 prompt 的記憶（personal[user] + workspace[active]，active 狀態、有上限）。 */
export async function getInjectableMemory(workspaceId: string, userId: string, limit = 6): Promise<{ text: string; ids: string[] }> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ci_memories")
    .select("id, kind, text, scope")
    .eq("status", "active")
    .or(`and(scope.eq.personal,user_id.eq.${userId}),and(scope.in.(workspace,project),workspace_id.eq.${workspaceId})`)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  const rows = (data as any[]) ?? [];
  if (!rows.length) return { text: "", ids: [] };
  const text = "【關於這位創作者 / 此工作空間的已知偏好】\n" + rows.map((r) => `- (${r.kind}) ${r.text}`).join("\n");
  return { text, ids: rows.map((r) => r.id) };
}

/** 記錄哪些記憶被注入哪個 run（透明度）。 */
export async function recordMemoryUsage(memoryIds: string[], agentRunId: number | null): Promise<void> {
  if (!memoryIds.length) return;
  const admin = createSupabaseAdmin();
  await admin.from("ci_memory_usage").insert(memoryIds.map((mid) => ({ memory_id: mid, agent_run_id: agentRunId }))).then(() => {}, () => {});
  await admin.from("ci_memories").update({ last_used_at: new Date().toISOString() }).in("id", memoryIds).then(() => {}, () => {});
}

export async function listMemory(scope: MemoryScope, ref: { userId?: string; workspaceId?: string }): Promise<Memory[]> {
  const admin = createSupabaseAdmin();
  let q = admin.from("ci_memories").select(COLS).eq("scope", scope).order("created_at", { ascending: false }).limit(100);
  if (scope === "personal" && ref.userId) q = q.eq("user_id", ref.userId);
  if ((scope === "workspace" || scope === "project") && ref.workspaceId) q = q.eq("workspace_id", ref.workspaceId);
  const { data } = await q;
  return (data as Memory[]) ?? [];
}

export async function createMemory(input: {
  scope: MemoryScope; userId?: string; workspaceId?: string; kind?: string; text: string; status?: string; source?: string;
}): Promise<Memory> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_memories").insert({
    scope: input.scope,
    user_id: input.scope === "personal" ? input.userId : null,
    workspace_id: input.scope === "personal" ? null : input.workspaceId,
    kind: input.kind ?? "note",
    text: input.text.slice(0, 2000),
    status: input.status ?? "active",
    source: input.source ?? "user",
  }).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Memory;
}

export async function setMemoryStatus(id: string, status: "active" | "rejected"): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_memories").update({ status }).eq("id", id);
}

export async function deleteMemory(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_memories").delete().eq("id", id);
}

export async function memoryById(id: string): Promise<Memory | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_memories").select(COLS).eq("id", id).maybeSingle();
  return (data as Memory) ?? null;
}
