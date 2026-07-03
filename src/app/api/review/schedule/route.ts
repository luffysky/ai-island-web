import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { scheduleReview } from "@/lib/srs";
import { rateLimit } from "@/lib/rate-limit";
import type { MiniQuiz } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/review/schedule { lessonRef, question }
// 把一題錯題排入 SRS 複習佇列（明天到期）。fire-and-forget，永遠回 200。
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`srs-schedule:${user.id}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const lessonRef = String(body?.lessonRef ?? "").trim().slice(0, 120);
  const question = body?.question as MiniQuiz | undefined;
  if (!lessonRef || !question?.question || !Array.isArray(question?.options) || !question?.answer) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 422 });
  }

  // 只保留必要欄位、避免存進髒資料
  const clean: MiniQuiz = {
    question: String(question.question).slice(0, 1000),
    options: question.options
      .slice(0, 8)
      .map((o: any) => ({ label: String(o?.label ?? "").slice(0, 400), value: String(o?.value ?? "").slice(0, 200) })),
    answer: String(question.answer).slice(0, 200),
    explanation: question.explanation ? String(question.explanation).slice(0, 1000) : undefined,
  };

  const r = await scheduleReview(user.id, lessonRef, clean);
  return NextResponse.json({ ok: r.ok });
}
