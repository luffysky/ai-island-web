import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 學員每章已完成 lesson 數
 * GET → { progress: { [chapter_id]: doneCount } }
 *
 * 用在 ChapterMap 進度條 + 章節詳情頁頂部
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ progress: {} });
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("lesson_progress")
    .select("chapter_id")
    .eq("user_id", user.id)
    .limit(5000);
  const progress: Record<number, number> = {};
  for (const row of ((data ?? []) as any[])) {
    const cid = Number(row.chapter_id);
    if (!cid) continue;
    progress[cid] = (progress[cid] ?? 0) + 1;
  }
  return NextResponse.json({ progress });
}
