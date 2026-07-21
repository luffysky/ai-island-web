import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { getOrCreateDailyFortune, taipeiToday } from "@/lib/fortune-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET：拿今日運勢（同人同日只生成一次、之後讀快取） */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const date = taipeiToday();

  // 先看快取有沒有；沒有才會真的燒 LLM → 對「生成」這條路才限流
  const { data: cached } = await admin
    .from("fortune_daily")
    .select("id")
    .eq("user_id", user.id).eq("date", date).eq("kind", "daily")
    .maybeSingle();
  if (!cached) {
    const rl = rateLimit(`fortune:today:${user.id}`, 10, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const result = await getOrCreateDailyFortune(admin, user.id, date);
  if (!result) return NextResponse.json({ needProfile: true });

  return NextResponse.json(result);
}
