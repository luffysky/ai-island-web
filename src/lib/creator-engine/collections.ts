/**
 * Creator Engine — Collections（自訂分類；多對多，一個碎片可同時在多個分類）。
 * 拖曳「複製到別的分類」= addToCollection（idempotent、不搬移原本的）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type CollectionWithItems = { id: string; name: string; assetIds: string[] };

/** 列出 workspace 的分類，附各分類的 asset_id 清單（給前端過濾/顯示）。 */
export async function listCollectionsWithItems(workspaceId: string): Promise<CollectionWithItems[]> {
  const admin = createSupabaseAdmin();
  const { data: cols } = await admin.from("ci_collections").select("id, name").eq("workspace_id", workspaceId).order("created_at");
  const list = (cols as any[]) ?? [];
  if (!list.length) return [];
  const ids = list.map((c) => c.id);
  const { data: items } = await admin.from("ci_collection_items").select("collection_id, asset_id").in("collection_id", ids);
  const byCol = new Map<string, string[]>();
  for (const it of ((items as any[]) ?? [])) {
    const arr = byCol.get(it.collection_id) ?? []; arr.push(it.asset_id); byCol.set(it.collection_id, arr);
  }
  return list.map((c) => ({ id: c.id, name: c.name, assetIds: byCol.get(c.id) ?? [] }));
}

export async function createCollection(workspaceId: string, userId: string, name: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_collections")
    .insert({ workspace_id: workspaceId, created_by: userId, name: name.slice(0, 80) })
    .select("id, name").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function collectionWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_collections").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}

export async function deleteCollection(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_collections").delete().eq("id", id);
}

/** 加入分類（idempotent；唯一鍵衝突 = 已在裡面、視為成功）。 */
export async function addToCollection(collectionId: string, assetId: string, assetType: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ci_collection_items").upsert(
    { collection_id: collectionId, asset_id: assetId, asset_type: assetType },
    { onConflict: "collection_id,asset_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

export async function removeFromCollection(collectionId: string, assetId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_collection_items").delete().eq("collection_id", collectionId).eq("asset_id", assetId);
}
