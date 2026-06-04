import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/quests — 取今日任務（順便 ensure 已建立）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ensure
  try { await supabase.rpc("ensure_daily_quests"); } catch {}

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_quests")
    .select("*")
    .eq("user_id", user.id)
    .eq("quest_date", today)
    .order("quest_date");

  return NextResponse.json({ quests: data ?? [] });
}
