import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notifyLessonComplete } from "@/lib/notify-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const chapterId = Number(body.chapter_id);
  const lessonId = String(body.lesson_id ?? "");
  const xp = Number(body.xp ?? 10);
  if (!chapterId || !lessonId) return NextResponse.json({ error: "bad_input" }, { status: 400 });
  // fire-and-forget
  notifyLessonComplete({ userId: user.id, chapterId, lessonId, xp }).catch(() => {});
  return NextResponse.json({ ok: true });
}
