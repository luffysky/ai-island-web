/**
 * Creator Engine — Lineage（M1）
 * derivation 走 ci_asset_relations（多型 id + asset_type）；composition 走 ci_work_fragments（在 works.ts）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type AssetType = "fragment" | "work" | "package" | "collection" | "workflow";
export type RelationType =
  | "evolved_from" | "condensed_from" | "recycled_from" | "transcreated_from"
  | "inspired_by" | "remixed_from" | "forked_from" | "quoted_by" | "packaged_in";

/** 記一條衍生關係（from 衍生自 to，例如 frag_B evolved_from frag_A → from=B,to=A）。best-effort。 */
export async function addRelation(
  workspaceId: string,
  from: { id: string; type: AssetType },
  to: { id: string; type: AssetType },
  relationType: RelationType,
): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ci_asset_relations").insert({
    workspace_id: workspaceId,
    from_asset_id: from.id,
    from_asset_type: from.type,
    to_asset_id: to.id,
    to_asset_type: to.type,
    relation_type: relationType,
  });
  if (error) throw new Error(error.message);
}

/** 取某資產的 lineage 邊（往來兩向）。 */
export async function getLineage(assetId: string): Promise<{ outgoing: any[]; incoming: any[] }> {
  const admin = createSupabaseAdmin();
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    admin.from("ci_asset_relations").select("*").eq("from_asset_id", assetId),
    admin.from("ci_asset_relations").select("*").eq("to_asset_id", assetId),
  ]);
  return { outgoing: outgoing ?? [], incoming: incoming ?? [] };
}
