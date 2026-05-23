import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/me/heatmap?days=90 — 回傳過去 N 天的「互動次數」by date
export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(180, parseInt(url.searchParams.get("days") ?? "90", 10) || 90));
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // 合併 4 個來源：lesson_progress + ai_messages + forum_replies + blog_articles
  const [{ data: lp }, { data: ai }, { data: fr }, { data: bl }] = await Promise.all([
    supabase.from("lesson_progress").select("created_at").eq("user_id", user.id).gte("created_at", since),
    supabase.from("ai_messages").select("created_at").eq("role", "user").gte("created_at", since), // ai_messages 沒 user_id 欄 → 但 RLS 應該擋住非自己的對話
    supabase.from("forum_replies").select("created_at").eq("user_id", user.id).gte("created_at", since),
    supabase.from("user_blog_articles").select("created_at").eq("user_id", user.id).gte("created_at", since),
  ]);

  const counts: Record<string, number> = {};
  const bump = (rows: any[] | null) => {
    for (const r of rows ?? []) {
      const key = (r.created_at as string).slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  };
  bump(lp);
  bump(ai);
  bump(fr);
  bump(bl);

  const points = Object.entries(counts).map(([date, count]) => ({ date, count }));
  return NextResponse.json({ points });
}
