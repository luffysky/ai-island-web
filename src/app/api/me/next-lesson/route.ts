import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";

export const dynamic = "force-dynamic";

/**
 * 推薦下一個 lesson 邏輯：
 *   1. 找最近完成的 lesson、若該章還有未完成 → 推薦同章下一個
 *   2. 若該章全完成 → 推薦下一章的第一個 lesson
 *   3. 若用戶完全沒進度 → 推薦 ch01 的 1.1
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("chapter_id, lesson_id, created_at:completed_at")
    .eq("user_id", user.id);

  const completedSet = new Set((progress ?? []).map((p: any) => p.lesson_id as string));

  // 新用戶 → ch01 1.1
  if (!progress || progress.length === 0) {
    const first = chapters[0];
    const lesson = first?.lessons[0];
    if (!lesson) return NextResponse.json({ recommendation: null });
    return NextResponse.json({
      recommendation: {
        chapter_id: first.id,
        chapter_title: first.title,
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        reason: "歡迎來到 AI 島、從 HTML 第一課開始你的冒險吧！",
      },
    });
  }

  // 找最近完成的 lesson 所在章節
  const sorted = [...progress].sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latestChapterId = (sorted[0] as any).chapter_id as number;

  const latestChapter = chapters.find((c) => c.id === latestChapterId);
  if (latestChapter) {
    // 該章還有未完成 → 推同章下一個
    const nextInChapter = latestChapter.lessons.find((l) => !completedSet.has(l.id));
    if (nextInChapter) {
      const idx = latestChapter.lessons.findIndex((l) => l.id === nextInChapter.id);
      return NextResponse.json({
        recommendation: {
          chapter_id: latestChapter.id,
          chapter_title: latestChapter.title,
          lesson_id: nextInChapter.id,
          lesson_title: nextInChapter.title,
          reason: `${latestChapter.title} 還剩 ${latestChapter.lessons.length - idx} 個 lesson、繼續推進！`,
        },
      });
    }
  }

  // 該章全完成 → 推下一章第一個
  const nextChapter = chapters
    .filter((c) => c.id > latestChapterId)
    .sort((a, b) => a.id - b.id)
    .find((c) => c.lessons.some((l) => !completedSet.has(l.id)));
  if (nextChapter) {
    const firstUndone = nextChapter.lessons.find((l) => !completedSet.has(l.id));
    if (firstUndone) {
      return NextResponse.json({
        recommendation: {
          chapter_id: nextChapter.id,
          chapter_title: nextChapter.title,
          lesson_id: firstUndone.id,
          lesson_title: firstUndone.title,
          reason: `恭喜完成上一章！開啟新章節：${nextChapter.title}`,
        },
      });
    }
  }

  // 全部完成
  return NextResponse.json({
    recommendation: null,
    finished_all: true,
  });
}
