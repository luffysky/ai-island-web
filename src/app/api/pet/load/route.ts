import { NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/pet/load
 * 回傳目前 user 的寵物。沒有就建一隻預設（招財 🐹）。
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ pet: null });

  const admin = createSupabaseAdmin();
  let { data: pet } = await admin
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pet) {
    const { data: created } = await admin
      .from("pets")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    pet = created;
  }

  return NextResponse.json({ pet });
}
