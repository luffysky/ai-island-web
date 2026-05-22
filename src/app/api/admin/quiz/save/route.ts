import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "chapter_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: "quiz.saved",
    target_type: "chapter_quiz",
    target_id: String(chapterId),
    changes: { question_count: (quiz.questions ?? []).length, is_published: !!quiz.is_published },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true });
}
