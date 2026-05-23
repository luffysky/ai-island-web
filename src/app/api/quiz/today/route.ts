import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { pickQuestions, ELO_DEFAULT } from "@/lib/elo";

export const dynamic = "force-dynamic";

type QuizQuestion = {
  q: string;
  options: { label: string; value: string }[];
  answer: string;
  source: "chapter" | "leetcode";
  source_id?: string;
  explanation?: string;
};

const TOTAL_QUESTIONS = 8;
const LEETCODE_RATIO = 0.5;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 從學過的章節 lesson.miniQuiz 抽題
function pickFromChapters(completedLessons: Set<string>, count: number): QuizQuestion[] {
  const pool: QuizQuestion[] = [];
  for (const ch of chapters) {
    for (const lesson of ch.lessons) {
      if (!completedLessons.has(lesson.id)) continue;
      if (!lesson.miniQuiz) continue;
      pool.push({
        q: lesson.miniQuiz.question,
        options: lesson.miniQuiz.options,
        answer: lesson.miniQuiz.answer,
        source: "chapter",
        source_id: lesson.id,
        explanation: lesson.miniQuiz.explanation,
      });
    }
  }
  return shuffle(pool).slice(0, count);
}

// GET /api/quiz/today
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  // 已存在 → 直接回
  const { data: existing } = await supabase
    .from("daily_quiz_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("quiz_date", today)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      attempt: existing,
      finished: !!existing.submitted_at,
    });
  }

  // 新抽題：先抓學過 lesson、再從章節 miniQuiz 取一半、leetcode 取另一半
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", user.id);
  const completedSet = new Set((progress ?? []).map((p: any) => p.lesson_id as string));

  const leetcodeCount = Math.floor(TOTAL_QUESTIONS * LEETCODE_RATIO);
  const chapterCount = TOTAL_QUESTIONS - leetcodeCount;

  const chapterQs = pickFromChapters(completedSet, chapterCount);

  // ELO 自適應出題：拿用戶 elo_rating、用 pickQuestions 在 ±80 範圍內挑
  const { data: profileRow } = await supabase.from("profiles").select("elo_rating").eq("id", user.id).single();
  const userR = (profileRow as any)?.elo_rating ?? ELO_DEFAULT;

  const { data: leetcode } = await supabase
    .from("leetcode_questions")
    .select("id, slug, title, body_md, options, answer, explanation, difficulty, rating, attempts")
    .eq("active", true)
    .limit(300); // 抓多一點讓 ELO 範圍篩有空間

  const eloPicked = pickQuestions((leetcode as any[]) ?? [], userR, leetcodeCount);
  const leetcodeQs: QuizQuestion[] = eloPicked.map((l: any) => ({
    q: `[${(l.difficulty ?? "easy").toUpperCase()}] ${l.title}\n\n${l.body_md}`,
    options: l.options,
    answer: l.answer,
    source: "leetcode",
    source_id: l.id,
    explanation: l.explanation,
  }));

  const questions = shuffle([...chapterQs, ...leetcodeQs]);

  if (questions.length === 0) {
    return NextResponse.json({
      attempt: null,
      finished: false,
      empty: true,
      message: "今天還沒有題庫可抽（先完成幾個 lesson 或 admin 灌 leetcode 題）",
    });
  }

  // 寫入 attempt
  const { data: created, error } = await supabase
    .from("daily_quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_date: today,
      questions,
      total: questions.length,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attempt: created, finished: false });
}
