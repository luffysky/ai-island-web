import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { grantZcoinOnce } from "@/lib/zcoin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Boss 測驗提交（server-authoritative）：答案由伺服器從章節資料讀取評分，前端不能自評/自灌 XP。
 * 首次通過才給 XP/Z幣（依 quizId 去重）。
 * POST { chapterId:number, quizId:string, answers:Record<string,string> } → { score, correct, total, perfect, xpAwarded, zCoinAwarded, isFirstAttempt }
 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const chapterId = Number(b.chapterId);
  const quizId = String(b.quizId ?? `chapter_boss_${chapterId}`);
  const answers = (b.answers ?? {}) as Record<string, string>;
  if (!Number.isFinite(chapterId)) return NextResponse.json({ error: "validation" }, { status: 422 });

  // 從章節 JSON 讀 boss quiz 的正解（伺服器端，前端無法竄改）
  let questions: Array<{ id: string; answer: string }> = [];
  try {
    const fp = path.join(process.cwd(), "src/data/chapters", `ch${String(chapterId).padStart(2, "0")}.json`);
    const raw = JSON.parse(await fs.readFile(fp, "utf8"));
    questions = Array.isArray(raw?.quiz?.questions) ? raw.quiz.questions : [];
  } catch { /* 讀不到 → 無題 */ }
  if (questions.length === 0) return NextResponse.json({ error: "no_quiz", message: "這章沒有 Boss 測驗" }, { status: 404 });

  // 伺服器評分
  let correct = 0;
  for (const q of questions) if (answers[q.id] === q.answer) correct++;
  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const perfect = correct === total;

  // 首次提交才給獎（之後是練習）
  const { data: prior } = await createSupabaseAdmin()
    .from("quiz_attempts").select("id").eq("user_id", user.id).eq("chapter_id", chapterId).eq("quiz_id", quizId).limit(1).maybeSingle();
  const isFirstAttempt = !prior;
  const xpAwarded = isFirstAttempt ? (perfect ? 100 : Math.round(score * 0.3)) : 0;
  const zCoinAwarded = isFirstAttempt && perfect ? 20 : 0;

  const admin = createSupabaseAdmin();
  await admin.from("quiz_attempts").insert({
    user_id: user.id, chapter_id: chapterId, quiz_id: quizId,
    score, total_questions: total, correct, xp_awarded: xpAwarded, z_coin_awarded: zCoinAwarded,
  });
  admin.from("learning_events").insert({
    user_id: user.id, event_type: perfect ? "quiz_perfect" : "quiz_complete", chapter_id: chapterId, lesson_id: quizId,
    metadata: { score, correct, total, perfect, xp_awarded: xpAwarded, z_coin_awarded: zCoinAwarded },
  }).then(() => {}, () => {});

  if (xpAwarded > 0) {
    await admin.from("xp_events").insert({ user_id: user.id, amount: xpAwarded, reason: perfect ? "quiz_perfect" : "quiz_pass", meta: { chapterId, quizId, correct, total } });
    const { data: prof } = await admin.from("profiles").select("xp").eq("id", user.id).single();
    await admin.from("profiles").update({ xp: ((prof as any)?.xp ?? 0) + xpAwarded }).eq("id", user.id);
  }
  if (zCoinAwarded > 0) await grantZcoinOnce(user.id, zCoinAwarded, "quiz_perfect", `quiz:${quizId}`, { chapterId, quizId });

  return NextResponse.json({ score, correct, total, perfect, xpAwarded, zCoinAwarded, isFirstAttempt });
}
