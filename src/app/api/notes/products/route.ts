import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET → 我上架的商品 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabase.from("note_products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ products: data ?? [] });
}

/** POST { title, description?, priceZ, noteIds[] } → 上架（把自己的一組筆記打包成商品） */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const title = String(b.title ?? "").trim().slice(0, 200);
  const description = b.description ? String(b.description).slice(0, 2000) : null;
  const priceZ = Math.max(0, Math.min(100000, Math.floor(Number(b.priceZ) || 0)));
  const noteIds: string[] = Array.isArray(b.noteIds) ? b.noteIds.filter((x: any) => typeof x === "string") : [];
  if (!title || noteIds.length === 0) return NextResponse.json({ error: "validation", message: "缺標題 / 至少選一則筆記" }, { status: 422 });

  // 只能打包自己的筆記
  const { data: owned } = await supabase.from("notes").select("id").eq("user_id", user.id).in("id", noteIds);
  const ownedIds = (owned ?? []).map((n: any) => n.id);
  if (ownedIds.length === 0) return NextResponse.json({ error: "no_own_notes", message: "選到的筆記不是你的" }, { status: 422 });

  const { data, error } = await supabase.from("note_products").insert({
    seller_id: user.id, title, description, price_z: priceZ, note_ids: ownedIds,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
