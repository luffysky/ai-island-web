import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type SubmittedAnswer = { questionIndex: number; choice: number };

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { chapterId, answers } = (await req.json().catch(() => ({}))) as {
    chapterId?: number;
    answers?: SubmittedAnswer[];
  };

  if (!chapterId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: quiz, error: quizErr } = await admin
    .from("chapter_quizzes")
    .select("chapter_id, questions, xp_per_correct, passing_score, is_published")
    .eq("chapter_id", chapterId)
    .maybeSingle();

  if (quizErr || !quiz) {
    return NextResponse.json({ error: "quiz_not_found" }, { status: 404 });
  }
  if (!quiz.is_published) {
    return NextResponse.json({ error: "quiz_not_published" }, { status: 403 });
  }

  const questions: Array<{ answer: number; explanation?: string }> =
    Array.isArray(quiz.questions) ? quiz.questions : [];
  if (questions.length === 0) {
    return NextResponse.json({ error: "no_questions" }, { status: 400 });
  }

  // Score
  let correct = 0;
  const perQuestion = questions.map((q, idx) => {
    const submitted = answers.find((a) => a.questionIndex === idx);
    const chosen = submitted?.choice ?? -1;
    const ok = chosen === q.answer;
    if (ok) correct++;
    return {
      questionIndex: idx,
      chosen,
      correctAnswer: q.answer,
      ok,
      explanation: q.explanation ?? null,
    };
  });

  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const perfect = correct === total;
  const passed = correct >= (quiz.passing_score ?? Math.ceil(total * 0.8));
  const xpPerCorrect = quiz.xp_per_correct ?? 5;
  const perfectBonus = perfect ? 20 : 0;

  // Dedupe: first successful attempt earns XP, later attempts are practice
  const quizId = `chapter_end_${chapterId}`;
  const { data: prior } = await admin
    .from("quiz_attempts")
    .select("id, xp_awarded")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .eq("quiz_id", quizId)
    .limit(1)
    .maybeSingle();

  const isFirstAttempt = !prior;
  const xpAwarded = isFirstAttempt ? correct * xpPerCorrect + perfectBonus : 0;
  const zCoinAwarded = isFirstAttempt && perfect ? 20 : 0;

  // Record attempt
  const { error: attemptErr } = await admin.from("quiz_attempts").insert({
    user_id: user.id,
    chapter_id: chapterId,
    quiz_id: quizId,
    score,
    total_questions: total,
    correct,
    xp_awarded: xpAwarded,
    z_coin_awarded: zCoinAwarded,
  });
  if (attemptErr) {
    return NextResponse.json({ error: attemptErr.message }, { status: 500 });
  }

  // Award XP / Z-coin (only first attempt)
  if (xpAwarded > 0) {
    await admin.from("xp_events").insert({
      user_id: user.id,
      amount: xpAwarded,
      reason: perfect ? "quiz_perfect" : "quiz_pass",
      meta: { source: "chapter_end_quiz", chapter: chapterId, correct, total },
    });

    const { data: profile } = await admin
      .from("profiles")
      .select("xp, z_coin")
      .eq("id", user.id)
      .single();
    if (profile) {
      await admin
        .from("profiles")
        .update({
          xp: (profile.xp ?? 0) + xpAwarded,
          z_coin: (profile.z_coin ?? 0) + zCoinAwarded,
        })
        .eq("id", user.id);
    }
    if (zCoinAwarded > 0) {
      await admin.from("coin_transactions").insert({
        user_id: user.id,
        amount: zCoinAwarded,
        balance_after: (profile?.z_coin ?? 0) + zCoinAwarded,
        reason: "quiz_perfect",
        meta: { source: "chapter_end_quiz", chapter: chapterId },
      });
    }
  }

  return NextResponse.json({
    correct,
    total,
    score,
    passed,
    perfect,
    xpAwarded,
    zCoinAwarded,
    isFirstAttempt,
    perQuestion,
  });
}
