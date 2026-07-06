import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 用 Z 幣購買筆記商品（原子 RPC）。 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "請先登入" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("buy_note_product", { p_product: id, p_buyer: user.id });
  if (error) return NextResponse.json({ error: "rpc_failed", message: error.message }, { status: 500 });
  const r = (data ?? {}) as any;
  if (!r.ok) {
    const msg = r.error === "insufficient_funds" ? `Z 幣不足（需 ${r.need}、你有 ${r.balance}）`
      : r.error === "own_product" ? "這是你自己的商品"
      : r.error === "inactive" ? "商品已下架"
      : r.error === "not_found" ? "找不到商品" : "購買失敗";
    return NextResponse.json({ error: r.error, message: msg }, { status: 400 });
  }
  return NextResponse.json(r);
}
