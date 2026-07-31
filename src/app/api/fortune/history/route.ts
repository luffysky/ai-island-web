import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET：過去的命理紀錄（最近 60 天）——每日運勢 + 塔羅 + 梅花易數，另回八字命盤（單張、依生日）。 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("fortune_daily")
    .select("date, kind, payload, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as any[];
  // 依日期聚合每日型紀錄（daily / tarot / iching 都是「當天發生」的事件）
  const byDate: Record<string, { date: string; daily?: any; tarot?: any; iching?: any }> = {};
  let bazi: { date: string; payload: any } | null = null;
  for (const r of rows) {
    if (r.kind === "bazi") {
      // 八字＝單張命盤（依生日快取、非每日事件）；取最新一張、不混進日期列
      if (!bazi) bazi = { date: r.date, payload: r.payload };
      continue;
    }
    byDate[r.date] ??= { date: r.date };
    if (r.kind === "daily") byDate[r.date].daily = r.payload;
    else if (r.kind === "tarot") byDate[r.date].tarot = r.payload;
    else if (r.kind === "iching") byDate[r.date].iching = r.payload;
  }
  const history = Object.values(byDate)
    .filter((it) => it.daily || it.tarot || it.iching)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 60);

  return NextResponse.json({ history, bazi });
}
