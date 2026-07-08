import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/** GET → 公開筆記已用到的分類清單（發佈時給使用者選；最後可自訂新增）。 */
export async function GET() {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("notes").select("category").eq("is_public", true).not("category", "is", null).limit(2000);
  const categories = Array.from(new Set((data ?? []).map((r: any) => r.category).filter(Boolean))).sort() as string[];
  return NextResponse.json({ categories }, { headers: { "Cache-Control": "private, max-age=30" } });
}
