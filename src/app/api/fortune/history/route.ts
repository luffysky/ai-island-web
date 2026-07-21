import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET：過去的每日運勢紀錄（最近 60 天、含塔羅），給歷史回顧。 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("fortune_daily")
    .select("date, kind, payload, created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(120);

  const rows = (data ?? []) as any[];
  // 依日期聚合：同一天可能有 daily + tarot
  const byDate: Record<string, { date: string; daily?: any; tarot?: any }> = {};
  for (const r of rows) {
    byDate[r.date] ??= { date: r.date };
    if (r.kind === "daily") byDate[r.date].daily = r.payload;
    else if (r.kind === "tarot") byDate[r.date].tarot = r.payload;
  }
  const history = Object.values(byDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 60);

  return NextResponse.json({ history });
}
