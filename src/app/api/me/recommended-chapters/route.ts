import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { recommendChapters } from "@/lib/chapter-recommend";

export const dynamic = "force-dynamic";

/** GET /api/me/recommended-chapters?n=5 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const n = Math.max(1, Math.min(10, parseInt(req.nextUrl.searchParams.get("n") ?? "5", 10) || 5));
  const recs = await recommendChapters(user.id, n);
  return NextResponse.json({ recommendations: recs });
}
