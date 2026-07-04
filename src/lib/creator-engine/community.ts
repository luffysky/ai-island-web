/**
 * Creator Engine — Community（follow/collect/like/comment + fork/remix）。
 * fork：把公開資產複製進自己 workspace + 記 forked_from/remixed_from 家譜。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { addRelation, type AssetType } from "@/lib/creator-engine/lineage";
import { notify, displayName } from "@/lib/creator-engine/notify";
import { sendPushToUser } from "@/lib/web-push";

/** 找社群資產（work / fragment）的擁有者 user id。找不到回 null。best-effort。 */
async function assetOwner(assetId: string, assetType?: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const tables = assetType === "work" ? ["ci_works"]
    : assetType === "fragment" ? ["ci_fragments"]
    : ["ci_works", "ci_fragments"];
  for (const t of tables) {
    const { data } = await admin.from(t).select("created_by").eq("id", assetId).maybeSingle();
    const owner = (data as any)?.created_by;
    if (owner) return owner as string;
  }
  return null;
}

async function toggle(table: string, match: Record<string, any>): Promise<{ on: boolean }> {
  const admin = createSupabaseAdmin();
  let q = admin.from(table).select("id");
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data: existing } = await q.maybeSingle();
  if (existing) { await admin.from(table).delete().eq("id", (existing as any).id); return { on: false }; }
  await admin.from(table).insert(match);
  return { on: true };
}

export const toggleFollow = (userId: string, targetType: "creator" | "studio", targetId: string) =>
  toggle("ci_follows", { follower_id: userId, target_type: targetType, target_id: targetId });
export const toggleCollect = (userId: string, assetId: string, assetType: string) =>
  toggle("ci_collects", { user_id: userId, asset_id: assetId, asset_type: assetType });
export async function toggleLike(userId: string, assetId: string): Promise<{ on: boolean }> {
  const res = await toggle("ci_likes", { user_id: userId, asset_id: assetId });
  if (res.on) {
    const owner = await assetOwner(assetId);
    if (owner && owner !== userId) {
      const who = await displayName(userId);
      notify(owner, { kind: "ci_like", title: `${who} 喜歡你的作品`, link: "/creator-island/community" });
      void sendPushToUser(owner, { title: "有人讚你的作品 ❤️", body: `${who} 喜歡你的作品`, url: "/creator-island/community", tag: `asset-like:${assetId}` });
    }
  }
  return res;
}

export async function likeCount(assetId: string): Promise<number> {
  const admin = createSupabaseAdmin();
  const { count } = await admin.from("ci_likes").select("id", { count: "exact", head: true }).eq("asset_id", assetId);
  return count ?? 0;
}

export async function listComments(assetId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_comments")
    .select("id, user_id, body, parent_id, created_at, profile:profiles(username, display_name)")
    .eq("asset_id", assetId).order("created_at", { ascending: true }).limit(200);
  return data ?? [];
}
export async function addComment(assetId: string, assetType: string, userId: string, body: string, parentId?: number) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_comments")
    .insert({ asset_id: assetId, asset_type: assetType, user_id: userId, body: body.slice(0, 2000), parent_id: parentId ?? null })
    .select("id, user_id, body, parent_id, created_at").single();
  if (error) throw new Error(error.message);
  const owner = await assetOwner(assetId, assetType);
  if (owner && owner !== userId) {
    const who = await displayName(userId);
    notify(owner, { kind: "ci_comment", title: `${who} 留言了你的作品`, body: body.slice(0, 80), link: "/creator-island/community" });
    void sendPushToUser(owner, { title: "有人留言你的作品 💬", body: `${who}：${body.slice(0, 60)}`, url: "/creator-island/community", tag: `asset-comment:${assetId}` });
  }
  return data;
}

export async function myCollects(userId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_collects").select("asset_id, asset_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}

/** 資產目前是否在市集上架販售中（#1：已上架/收費資產不能免費 fork）。 */
async function isListedForSale(assetId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_listings").select("id").eq("asset_id", assetId).eq("status", "listed").limit(1).maybeSingle();
  return !!data;
}

/** 使用者是否已可存取此資產：已購買(entitlement) 或 本人擁有。 */
async function buyerHasAccess(assetId: string, userId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data: ent } = await admin.from("ci_entitlements").select("id").eq("buyer_id", userId).eq("asset_id", assetId).limit(1).maybeSingle();
  if (ent) return true;
  const owner = await assetOwner(assetId);
  return owner === userId;
}

/** Fork/remix：把公開的 fragment/work 複製進目標 workspace + 記家譜。 */
export async function forkAsset(assetId: string, assetType: AssetType, toWorkspaceId: string, userId: string, remix = false): Promise<{ id: string; type: AssetType }> {
  const admin = createSupabaseAdmin();
  // #1：已上架販售的資產不能免費 fork（除非本人擁有或已購買）→ 要走市集購買。
  if (await isListedForSale(assetId) && !(await buyerHasAccess(assetId, userId))) {
    throw new Error("asset_gated_buy_required");
  }
  let newId: string;
  if (assetType === "fragment") {
    const { data: src } = await admin.from("ci_fragments").select("title, content, tags").eq("id", assetId).maybeSingle();
    if (!src) throw new Error("source_not_found");
    const { data, error } = await admin.from("ci_fragments").insert({
      workspace_id: toWorkspaceId, created_by: userId,
      title: (src as any).title, content: (src as any).content, tags: (src as any).tags ?? [],
      source_type: "market_imported",
    }).select("id").single();
    if (error) throw new Error(error.message);
    newId = (data as any).id;
  } else if (assetType === "work") {
    const { data: src } = await admin.from("ci_works").select("title, body, work_type").eq("id", assetId).maybeSingle();
    if (!src) throw new Error("source_not_found");
    const { data, error } = await admin.from("ci_works").insert({
      workspace_id: toWorkspaceId, created_by: userId,
      title: (src as any).title, body: (src as any).body, work_type: (src as any).work_type, source_type: "market_imported",
    }).select("id").single();
    if (error) throw new Error(error.message);
    newId = (data as any).id;
  } else {
    throw new Error("unsupported_asset_type");
  }
  await addRelation(toWorkspaceId, { id: newId, type: assetType }, { id: assetId, type: assetType }, remix ? "remixed_from" : "forked_from").catch(() => {});
  return { id: newId, type: assetType };
}
