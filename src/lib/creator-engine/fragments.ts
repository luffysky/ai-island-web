/**
 * Creator Engine — Fragments（M1）
 * 使用者端碎片庫（ci_fragments，workspace-scoped）。與 admin idea_fragments 分開。
 * 寫入走 service-role；workspace 權限由 API 層 requireWorkspaceRole 把關。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type Fragment = {
  id: string;
  workspace_id: string;
  created_by: string | null;
  title: string;
  content: string;
  tags: string[];
  mood: string | null;
  category: string | null;
  source_type: string;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
};

const COLS = "id, workspace_id, created_by, title, content, tags, mood, category, source_type, ai_summary, created_at, updated_at";

export type ListOpts = { cursor?: string | null; q?: string | null; tag?: string | null; limit?: number };

/** 分頁列出（cursor = created_at；避免 PostgREST 1000 筆截斷）。 */
export async function listFragments(workspaceId: string, opts: ListOpts = {}): Promise<{ items: Fragment[]; nextCursor: string | null }> {
  const admin = createSupabaseAdmin();
  const limit = Math.max(1, Math.min(100, opts.limit ?? 20));
  let query = admin.from("ci_fragments").select(COLS).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(limit + 1);
  if (opts.cursor) query = query.lt("created_at", opts.cursor);
  if (opts.tag) query = query.contains("tags", [opts.tag]);
  if (opts.q) query = query.or(`title.ilike.%${opts.q}%,content.ilike.%${opts.q}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as Fragment[]) ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].created_at : null };
}

export async function getFragment(id: string): Promise<Fragment | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_fragments").select(COLS).eq("id", id).maybeSingle();
  return (data as Fragment) ?? null;
}

export async function createFragment(
  workspaceId: string,
  userId: string,
  input: { title: string; content?: string; tags?: string[]; mood?: string; category?: string; sourceType?: string },
): Promise<Fragment> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ci_fragments")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      title: input.title.slice(0, 200),
      content: input.content ?? "",
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 30),
      mood: input.mood ?? null,
      category: input.category ?? null,
      source_type: input.sourceType ?? "human_original",
    })
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Fragment;
}

export async function updateFragment(id: string, patch: Partial<Pick<Fragment, "title" | "content" | "tags" | "mood" | "category">>): Promise<Fragment> {
  const admin = createSupabaseAdmin();
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) clean.title = patch.title.slice(0, 200);
  if (patch.content !== undefined) clean.content = patch.content;
  if (patch.tags !== undefined) clean.tags = patch.tags.map((t) => t.trim()).filter(Boolean).slice(0, 30);
  if (patch.mood !== undefined) clean.mood = patch.mood;
  if (patch.category !== undefined) clean.category = patch.category;
  const { data, error } = await admin.from("ci_fragments").update(clean).eq("id", id).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Fragment;
}

export async function deleteFragment(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ci_fragments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** 取碎片所屬 workspace（API 層權限檢查用）。 */
export async function fragmentWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_fragments").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}
