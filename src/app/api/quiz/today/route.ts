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
// 防重複：最近這幾天出過的題（依 source_id）優先不再抽，題庫不夠才會回頭用
const RECENT_DAYS = 14;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 優先抽「最近沒出過」的題；不夠再補最近出過的（一樣 shuffle、避免每天同一份）
function pickPreferFresh<T extends { source_id?: string }>(
  pool: T[],
  count: number,
  recent: Set<string>,
): T[] {
  const fresh = shuffle(pool.filter((q) => !q.source_id || !recent.has(String(q.source_id))));
  if (fresh.length >= count) return fresh.slice(0, count);
  const stale = shuffle(pool.filter((q) => q.source_id && recent.has(String(q.source_id))));
  return [...fresh, ...stale].slice(0, count);
}

// 學過的章節 lesson.miniQuiz 全部候選（不在這裡 slice、交給 pickPreferFresh）
function buildChapterPool(completedLessons: Set<string>): QuizQuestion[] {
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
  return pool;
}

function toLeetQuestion(l: any): QuizQuestion {
  return {
    q: `[${(l.difficulty ?? "easy").toUpperCase()}] ${l.title}\n\n${l.body_md}`,
    options: l.options,
    answer: l.answer,
    source: "leetcode",
    source_id: l.id,
    explanation: l.explanation,
  };
}

// GET /api/quiz/today
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  // 已存在 → 直接回（同一天鎖同一份考卷）
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

  // 最近 RECENT_DAYS 天出過的 source_id（防短期重複）
  const sinceDate = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { data: recentAttempts } = await supabase
    .from("daily_quiz_attempts")
    .select("questions, correct, total, submitted_at")
    .eq("user_id", user.id)
    .gte("quiz_date", sinceDate);
  const recentIds = new Set<string>();
  let answeredCorrect = 0, answeredTotal = 0;
  for (const a of recentAttempts ?? []) {
    const qs = Array.isArray((a as any).questions) ? (a as any).questions : [];
    for (const q of qs) if (q?.source_id) recentIds.add(String(q.source_id));
    if ((a as any).submitted_at && (a as any).total) {
      answeredCorrect += (a as any).correct ?? 0;
      answeredTotal += (a as any).total;
    }
  }
  // 近期答對率（用來把難度往上/往下調）
  const recentAccuracy = answeredTotal > 0 ? answeredCorrect / answeredTotal : null;

  // 學過的 lesson
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", user.id);
  const completedSet = new Set((progress ?? []).map((p: any) => p.lesson_id as string));

  // ELO + 近期答對率 → 自適應難度
  const { data: profileRow } = await supabase.from("profiles").select("elo_rating").eq("id", user.id).single();
  const userR = (profileRow as any)?.elo_rating ?? ELO_DEFAULT;
  // 近期答對率高（>0.7）→ 目標難度上調、低 → 下調（比純 ELO 更快反應「最近表現」）
  const effectiveR = recentAccuracy == null ? userR
    : Math.max(800, Math.min(2200, Math.round(userR + (recentAccuracy - 0.7) * 300)));
  // 新手（rating 低）多給親民的章節題、進階多給 leetcode
  const leetRatio = effectiveR < 1000 ? 0.375 : effectiveR > 1400 ? 0.625 : LEETCODE_RATIO;
  const leetcodeCount = Math.round(TOTAL_QUESTIONS * leetRatio);
  const chapterCount = TOTAL_QUESTIONS - leetcodeCount;

  // 章節題池 → 優先抽沒出過的
  const chapterPool = buildChapterPool(completedSet);
  const chapterQs = pickPreferFresh(chapterPool, chapterCount, recentIds);

  const { data: leetcode } = await supabase
    .from("leetcode_questions")
    .select("id, slug, title, body_md, options, answer, explanation, difficulty, rating, attempts")
    .eq("active", true)
    .limit(300); // 抓多一點讓 ELO 範圍 + 防重複篩有空間

  const leetAll = (leetcode as any[]) ?? [];
  const leetFresh = leetAll.filter((l) => !recentIds.has(String(l.id)));
  let leetPicked = pickQuestions(leetFresh, effectiveR, leetcodeCount);
  if (leetPicked.length < leetcodeCount) {
    // 沒出過的不夠 → 從全部（含最近出過）補、去掉已選
    const chosen = new Set(leetPicked.map((x: any) => String(x.id)));
    leetPicked = [
      ...leetPicked,
      ...pickQuestions(leetAll.filter((l) => !chosen.has(String(l.id))), effectiveR, leetcodeCount - leetPicked.length),
    ];
  }
  const leetcodeQs: QuizQuestion[] = leetPicked.map(toLeetQuestion);

  // 組題 + backfill：某一邊題庫不夠時、用另一邊補滿 TOTAL_QUESTIONS
  let questions: QuizQuestion[] = [...chapterQs, ...leetcodeQs];

  if (questions.length < TOTAL_QUESTIONS && chapterPool.length > chapterQs.length) {
    const usedChapter = new Set(chapterQs.map((q) => q.source_id));
    const more = pickPreferFresh(
      chapterPool.filter((q) => !usedChapter.has(q.source_id)),
      TOTAL_QUESTIONS - questions.length,
      recentIds,
    );
    questions = [...questions, ...more];
  }
  if (questions.length < TOTAL_QUESTIONS && leetAll.length > leetPicked.length) {
    const usedLeet = new Set(leetPicked.map((x: any) => String(x.id)));
    const more = pickQuestions(
      leetAll.filter((l) => !usedLeet.has(String(l.id))),
      effectiveR,
      TOTAL_QUESTIONS - questions.length,
    ).map(toLeetQuestion);
    questions = [...questions, ...more];
  }

  questions = shuffle(questions);

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
