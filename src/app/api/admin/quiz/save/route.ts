import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { chapterId, quiz } = await req.json();
  if (!chapterId || !quiz) return NextResponse.json({ error: "missing" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("chapter_quizzes").upsert({
    chapter_id: Number(chapterId),
    title: quiz.title ?? null,
    description: quiz.description ?? null,
    xp_per_correct: Number(quiz.xp_per_correct ?? 5),
    passing_score: Number(quiz.passing_score ?? 16),
    questions: quiz.questions ?? [],
    is_published: !!quiz.is_published,
    created_by: gate.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "chapter_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "quiz.saved",
    target_type: "chapter_quiz",
    target_id: String(chapterId),
    changes: { question_count: (quiz.questions ?? []).length, is_published: !!quiz.is_published },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true });
}
