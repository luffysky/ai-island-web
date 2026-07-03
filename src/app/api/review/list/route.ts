import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getDueReviews } from "@/lib/srs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/review/list — 今日到期複習題
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const reviews = await getDueReviews(user.id);
  return NextResponse.json({ ok: true, reviews });
}
