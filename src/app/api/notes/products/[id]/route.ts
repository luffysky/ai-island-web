import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → 商品詳情。owned/seller 才回傳筆記全文，否則只回標題（試閱）。 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdmin();

  const { data: product } = await admin.from("note_products").select("*").eq("id", id).maybeSingle();
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const p = product as any;

  const { data: seller } = await admin.from("profiles").select("username, display_name, avatar_url, bio").eq("id", p.seller_id).maybeSingle();
  const isSeller = user?.id === p.seller_id;
  let owned = isSeller;
  if (user && !owned) {
    const { data: purchase } = await admin.from("note_product_purchases").select("id").eq("product_id", id).eq("buyer_id", user.id).maybeSingle();
    owned = !!purchase;
  }

  // 筆記：擁有/賣家 → 全文；否則只給標題（試閱）
  const { data: notes } = await admin.from("notes").select("id, title, content, updated_at").in("id", p.note_ids ?? []);
  const noteRows = (notes as any[]) ?? [];
  const notesOut = noteRows.map((n) => ({
    id: n.id, title: n.title?.trim() || "（無標題筆記）",
    content: owned ? n.content : null,
  }));

  return NextResponse.json({
    product: { id: p.id, title: p.title, description: p.description, priceZ: p.price_z, sales: p.sales, isActive: p.is_active, noteCount: (p.note_ids ?? []).length },
    seller: seller ? { username: (seller as any).username, name: (seller as any).display_name || (seller as any).username, avatar: (seller as any).avatar_url, bio: (seller as any).bio } : null,
    owned, isSeller, notes: notesOut,
  });
}
