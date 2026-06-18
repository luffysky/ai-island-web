import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * 學習進度細節（跨裝置同步）。前台以 localStorage 為離線快取、登入後跟此 API 雙向合併。
 *
 * GET  → { reading: [...], engagement: [...] }（該 user 全部）
 * POST → 合併 upsert：
 *   reading：current 永遠覆蓋；furthest 只在 index 前進時才更新（回頭複習不倒退）
 *   engagement：scroll_depth / dwell_ms 取 max；quiz_passed / playground_run 取 OR
 *
 * 身分由 Supabase session cookie 決定、body 不帶 user_id（避免偽造）。
 */

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [reading, engagement] = await Promise.all([
    supabase.from("reading_position").select("*").eq("user_id", user.id),
    supabase.from("lesson_engagement").select("*").eq("user_id", user.id),
  ]);

  return NextResponse.json({
    reading: reading.data ?? [],
    engagement: engagement.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const reading: any[] = Array.isArray(body?.reading) ? body.reading : [];
  const engagement: any[] = Array.isArray(body?.engagement) ? body.engagement : [];
  const now = new Date().toISOString();

  // ---- reading_position：furthest 取較遠者、current 覆蓋 ----
  if (reading.length > 0) {
    const chapterIds = reading.map((r) => Number(r.chapterId)).filter((n) => Number.isFinite(n));
    const { data: existing } = await supabase
      .from("reading_position").select("*")
      .eq("user_id", user.id).in("chapter_id", chapterIds);
    const prevByCh = new Map<number, any>((existing ?? []).map((r: any) => [r.chapter_id, r]));

    const rows = reading.map((r) => {
      const prev = prevByCh.get(Number(r.chapterId));
      const inIdx = Number.isFinite(r.furthestIndex) ? Number(r.furthestIndex) : -1;
      const prevIdx = prev?.furthest_lesson_index ?? -1;
      const keepPrevFurthest = prev && prevIdx >= inIdx;
      return {
        user_id: user.id,
        chapter_id: Number(r.chapterId),
        current_lesson_id: r.currentLessonId ?? prev?.current_lesson_id ?? null,
        current_lesson_index: r.currentIndex ?? prev?.current_lesson_index ?? null,
        current_lesson_number: r.currentNumber ?? prev?.current_lesson_number ?? null,
        current_lesson_title: r.currentTitle ?? prev?.current_lesson_title ?? null,
        furthest_lesson_id: keepPrevFurthest ? prev.furthest_lesson_id : (r.furthestLessonId ?? null),
        furthest_lesson_index: keepPrevFurthest ? prev.furthest_lesson_index : (Number.isFinite(r.furthestIndex) ? Number(r.furthestIndex) : null),
        furthest_lesson_number: keepPrevFurthest ? prev.furthest_lesson_number : (r.furthestNumber ?? null),
        furthest_lesson_title: keepPrevFurthest ? prev.furthest_lesson_title : (r.furthestTitle ?? null),
        updated_at: now,
      };
    });
    await supabase.from("reading_position").upsert(rows, { onConflict: "user_id,chapter_id" });
  }

  // ---- lesson_engagement：scroll/dwell 取 max、布林 OR ----
  if (engagement.length > 0) {
    const lessonIds = engagement.map((e) => String(e.lessonId)).filter(Boolean);
    const { data: existing } = await supabase
      .from("lesson_engagement").select("*")
      .eq("user_id", user.id).in("lesson_id", lessonIds);
    const prevByLesson = new Map<string, any>((existing ?? []).map((r: any) => [r.lesson_id, r]));

    const rows = engagement.map((e) => {
      const prev = prevByLesson.get(String(e.lessonId));
      return {
        user_id: user.id,
        chapter_id: Number(e.chapterId),
        lesson_id: String(e.lessonId),
        scroll_depth: Math.max(Number(e.scrollDepth) || 0, prev?.scroll_depth ?? 0),
        dwell_ms: Math.max(Number(e.dwellMs) || 0, Number(prev?.dwell_ms ?? 0)),
        quiz_passed: Boolean(e.quizPassed) || Boolean(prev?.quiz_passed),
        playground_run: Boolean(e.playgroundRun) || Boolean(prev?.playground_run),
        updated_at: now,
      };
    });
    await supabase.from("lesson_engagement").upsert(rows, { onConflict: "user_id,lesson_id" });
  }

  return NextResponse.json({ ok: true });
}
