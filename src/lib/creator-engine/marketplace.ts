/**
 * Creator Engine — Marketplace（Z 幣 phase1；抽成 0%、賣家進 workspace wallet）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const COLS = "id, workspace_id, asset_id, asset_type, title, description, price_z, ai_generated_label, status, created_at";

export async function createListing(workspaceId: string, userId: string, input: { assetId: string; assetType: string; title: string; description?: string; priceZ: number }) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_listings").insert({
    workspace_id: workspaceId, created_by: userId,
    asset_id: input.assetId, asset_type: input.assetType,
    title: input.title.slice(0, 200), description: input.description ?? "",
    price_z: Math.max(0, Math.floor(input.priceZ || 0)),
  }).select(COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listListings(opts: { cursor?: string | null; limit?: number } = {}) {
  const admin = createSupabaseAdmin();
  const limit = Math.max(1, Math.min(50, opts.limit ?? 24));
  let q = admin.from("ci_listings").select(COLS).eq("status", "listed").order("created_at", { ascending: false }).limit(limit + 1);
  if (opts.cursor) q = q.lt("created_at", opts.cursor);
  const { data } = await q;
  const rows = (data as any[]) ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].created_at : null };
}

export async function getListing(id: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_listings").select(COLS).eq("id", id).maybeSingle();
  return data;
}

export async function listingWorkspace(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_listings").select("workspace_id").eq("id", id).maybeSingle();
  return (data as any)?.workspace_id ?? null;
}

export async function purchaseListing(listingId: string, buyerId: string): Promise<any> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("ci_purchase_listing", { p_listing_id: listingId, p_buyer: buyerId });
  if (error) throw new Error(error.message);
  if ((data as any)?.ok && !(data as any)?.already_owned) {
    import("@/lib/creator-engine/notify").then((m) => m.notifyIslandAdmin(`市集成交：花 ${(data as any).spent ?? 0} Z 幣`, `sale:${(data as any).transaction}`)).catch(() => {});
  }
  return data;
}

export async function unlistListing(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_listings").update({ status: "unlisted" }).eq("id", id);
}
