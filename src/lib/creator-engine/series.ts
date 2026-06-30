/**
 * Creator Engine — 系列 / 專輯（ci_series）。
 * kind: 'series'(系列，所有創作類) | 'album'(專輯，歌詞用)。category = 再分類群組。
 * 草稿/作品用 series_id 歸屬。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const COLS = "id, workspace_id, user_id, kind, title, description, cover_url, category, created_at, updated_at";

export type Series = {
  id: string; workspace_id: string; user_id: string;
  kind: string; title: string; description: string;
  cover_url: string | null; category: string;
  created_at: string; updated_at: string;
};

export async function listSeries(workspaceId: string, kind?: string): Promise<Series[]> {
  const admin = createSupabaseAdmin();
  let q = admin.from("ci_series").select(COLS).eq("workspace_id", workspaceId);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q.order("category").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Series[]) ?? [];
}

export async function seriesWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_series").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}

export async function createSeries(
  workspaceId: string, userId: string,
  input: { kind?: string; title: string; description?: string; category?: string; coverUrl?: string },
): Promise<Series> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_series").insert({
    workspace_id: workspaceId, user_id: userId,
    kind: input.kind === "album" ? "album" : "series",
    title: (input.title || "未命名系列").slice(0, 120),
    description: input.description ?? "",
    category: (input.category ?? "").slice(0, 60),
    cover_url: input.coverUrl ?? null,
  }).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Series;
}

export async function updateSeries(
  id: string,
  patch: Partial<Pick<Series, "title" | "description" | "category" | "cover_url">>,
): Promise<Series> {
  const admin = createSupabaseAdmin();
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) clean.title = String(patch.title).slice(0, 120);
  if (patch.description !== undefined) clean.description = patch.description;
  if (patch.category !== undefined) clean.category = String(patch.category).slice(0, 60);
  if (patch.cover_url !== undefined) clean.cover_url = patch.cover_url;
  const { data, error } = await admin.from("ci_series").update(clean).eq("id", id).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as Series;
}

export async function deleteSeries(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  // 解除草稿/作品歸屬（FK 已 ON DELETE SET NULL，但雙保險）
  await admin.from("ci_drafts").update({ series_id: null }).eq("series_id", id).then(() => {}, () => {});
  await admin.from("ci_works").update({ series_id: null }).eq("series_id", id).then(() => {}, () => {});
  const { error } = await admin.from("ci_series").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** 系列底下的草稿（簡列，給建立頁/系列頁顯示）。 */
export async function seriesDrafts(seriesId: string): Promise<{ id: string; title: string; work_type: string; status: string; series_order: number }[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_drafts")
    .select("id, title, work_type, status, series_order")
    .eq("series_id", seriesId).neq("status", "archived")
    .order("series_order").order("updated_at", { ascending: false });
  return (data as any[]) ?? [];
}
