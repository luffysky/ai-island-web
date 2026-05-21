import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

// GET /api/forum/boards — 取所有啟用的版塊
export async function GET() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("forum_boards")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ boards: data });
}
