import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const answers = Array.isArray(body.answers) ? body.answers.map((a: any) => String(a ?? "")) : [];

  const today = new Date().toISOString().slice(0, 10);
  const { data: attempt } = await supabase
    .from("daily_quiz_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("quiz_date", today)
    .maybeSingle();
  if (!attempt) return NextResponse.json({ error: "no_attempt_today" }, { status: 404 });
  if (attempt.submitted_at) return NextResponse.json({ error: "already_submitted" }, { status: 400 });

  const questions: any[] = Array.isArray(attempt.questions) ? attempt.questions : [];
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] && String(answers[i]) === String(questions[i].answer)) correct++;
  }

  const total = questions.length;
  const pass = total > 0 && correct / total >= 0.6;
  const reward_xp = pass ? 20 + correct * 5 : correct * 2;
  const reward_z = pass ? 8 + Math.floor(correct / 2) : 0;

  await supabase
    .from("daily_quiz_attempts")
    .update({
      answers,
      correct,
      total,
      reward_xp,
      reward_z,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);

  // 發 XP / z 幣
  if (reward_xp > 0) {
    await supabase.from("xp_events").insert({
      user_id: user.id,
      amount: reward_xp,
      reason: "daily_quiz",
      meta: { correct, total, pass },
    });
    try {
      await supabase.rpc("increment_profile_xp" as any, { p_user_id: user.id, p_amount: reward_xp });
    } catch {
      // fallback：手動 update
      const { data: prof } = await supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle();
      await supabase.from("profiles").update({ xp: (prof?.xp ?? 0) + reward_xp }).eq("id", user.id);
    }
  }
  if (reward_z > 0) {
    const { data: prof } = await supabase.from("profiles").select("z_coin").eq("id", user.id).maybeSingle();
    const newBal = (prof?.z_coin ?? 0) + reward_z;
    await supabase.from("profiles").update({ z_coin: newBal }).eq("id", user.id);
    await supabase.from("coin_transactions").insert({
      user_id: user.id,
      amount: reward_z,
      balance_after: newBal,
      reason: "daily_quiz",
      meta: { correct, total },
    });
  }

  // quest 推進
  await supabase.rpc("increment_quest_progress", { p_quest_type: "daily_quiz", p_delta: 1 });

  return NextResponse.json({ ok: true, correct, total, pass, reward_xp, reward_z });
}
