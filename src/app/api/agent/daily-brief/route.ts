import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { buildDailyBrief } from "@/lib/daily-brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/daily-brief — 今天值得做的 3 件事（規則式、零 AI 成本）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await buildDailyBrief(user.id).catch(() => [] as string[]);
  return NextResponse.json({ items });
}
