import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { LearningDashboard } from "@/components/me/LearningDashboard";

export const dynamic = "force-dynamic";

export default async function LearningDashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: eng }, { data: prog }, { data: reading }, { data: prof }, { data: quiz }] = await Promise.all([
    supabase.from("lesson_engagement").select("chapter_id, lesson_id, scroll_depth, dwell_ms, quiz_passed, playground_run").eq("user_id", user.id),
    supabase.from("lesson_progress").select("lesson_id, chapter_id").eq("user_id", user.id),
    supabase.from("reading_position").select("chapter_id, furthest_lesson_index, furthest_lesson_title").eq("user_id", user.id),
    supabase.from("profiles").select("level, xp, elo_rating").eq("id", user.id).maybeSingle(),
    supabase.from("daily_quiz_attempts").select("quiz_date, correct, total").eq("user_id", user.id).not("submitted_at", "is", null).order("quiz_date", { ascending: true }).limit(30),
  ] as any);

  const completed = new Set<string>(((prog as any[]) ?? []).map((p) => p.lesson_id as string));
  const engRows = (eng as any[]) ?? [];

  // 掌握度分布：已掌握 = 完成 / 答對 miniQuiz / 跑過 playground；讀完 = 捲動≥90%；掃過 = >15%
  let mastered = 0, read = 0, skim = 0, totalDwellMs = 0, quizPassed = 0, playgroundRun = 0;
  const engaged = new Set<string>();
  for (const e of engRows) {
    engaged.add(e.lesson_id);
    totalDwellMs += Number(e.dwell_ms || 0);
    if (e.quiz_passed) quizPassed++;
    if (e.playground_run) playgroundRun++;
    if (completed.has(e.lesson_id) || e.quiz_passed || e.playground_run) mastered++;
    else if ((e.scroll_depth ?? 0) >= 0.9) read++;
    else if ((e.scroll_depth ?? 0) > 0.15) skim++;
  }
  // 完成但沒 engagement row 的 lesson 也算「已掌握」
  for (const lid of completed) if (!engaged.has(lid)) mastered++;

  const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0);

  // 每章「最遠到達 vs 已完成」
  const chapterProgress = chapters.map((ch) => {
    const r = ((reading as any[]) ?? []).find((x) => x.chapter_id === ch.id);
    const idx = r?.furthest_lesson_index ?? -1;
    const furthestPct = ch.lessons.length > 0 ? Math.max(0, Math.min(100, Math.round(((idx + 1) / ch.lessons.length) * 100))) : 0;
    const doneInCh = ((prog as any[]) ?? []).filter((p) => p.chapter_id === ch.id).length;
    const donePct = ch.lessons.length > 0 ? Math.round((doneInCh / ch.lessons.length) * 100) : 0;
    return { id: ch.id, title: ch.title, furthestPct, donePct };
  }).filter((c) => c.furthestPct > 0 || c.donePct > 0).slice(0, 14);

  const quizTrend = ((quiz as any[]) ?? []).map((q) => ({
    date: String(q.quiz_date).slice(5), // MM-DD
    acc: q.total ? Math.round((q.correct / q.total) * 100) : 0,
  }));

  return (
    <LearningDashboard
      data={{
        mastered, read, skim,
        totalStudyMinutes: Math.round(totalDwellMs / 60000),
        quizPassed, playgroundRun,
        completedCount: completed.size, totalLessons,
        level: (prof as any)?.level ?? 1, xp: (prof as any)?.xp ?? 0, elo: (prof as any)?.elo_rating ?? 1200,
        chapterProgress, quizTrend,
      }}
    />
  );
}
