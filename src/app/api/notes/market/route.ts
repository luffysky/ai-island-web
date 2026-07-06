import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → 知識市集：上架中的筆記商品（含賣家名 + 篇數） */
export async function GET() {
  const admin = createSupabaseAdmin();
  const { data: products } = await admin.from("note_products")
    .select("id, seller_id, title, description, price_z, note_ids, sales, created_at")
    .eq("is_active", true).order("created_at", { ascending: false }).limit(60);
  const rows = (products as any[]) ?? [];
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const sellerMap: Record<string, any> = {};
  if (sellerIds.length) {
    const { data: sellers } = await admin.from("profiles").select("id, username, display_name, avatar_url").in("id", sellerIds);
    for (const s of (sellers ?? []) as any[]) sellerMap[s.id] = s;
  }
  const items = rows.map((r) => ({
    id: r.id, title: r.title, description: r.description, priceZ: r.price_z,
    noteCount: (r.note_ids ?? []).length, sales: r.sales,
    seller: sellerMap[r.seller_id] ? { username: sellerMap[r.seller_id].username, name: sellerMap[r.seller_id].display_name || sellerMap[r.seller_id].username, avatar: sellerMap[r.seller_id].avatar_url } : null,
  }));
  return NextResponse.json({ items });
}
