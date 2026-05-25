import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Nami 挑戰提交
 *   POST { challenge_id, code, passed: boolean, error?: string }
 *   client 端在 Pyodide 跑完 user_code + test_code、回報結果。
 *   server 寫 progress、若 passed 第一次、發 XP。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const challengeId = String(body.challenge_id ?? "");
  const code = String(body.code ?? "");
  const passed = !!body.passed;
  if (!challengeId) return NextResponse.json({ error: "no_challenge" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: challenge } = await admin
    .from("nami_challenges")
    .select("id, xp_award, title")
    .eq("id", challengeId)
    .maybeSingle();
  if (!challenge) return NextResponse.json({ error: "challenge_not_found" }, { status: 404 });

  // 拿目前 progress
  const { data: existing } = await admin
    .from("nami_challenge_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  const isFirstPass = passed && existing?.status !== "passed";

  // upsert
  await admin.from("nami_challenge_progress").upsert(
    {
      user_id: user.id,
      challenge_id: challengeId,
      status: passed ? "passed" : "attempted",
      attempts: ((existing as any)?.attempts ?? 0) + 1,
      best_code: passed ? code : (existing?.best_code ?? code),
      last_attempted_at: new Date().toISOString(),
      passed_at: passed && !existing?.passed_at ? new Date().toISOString() : (existing as any)?.passed_at ?? null,
    },
    { onConflict: "user_id,challenge_id" },
  );

  // 第一次 pass：加 XP + 記 xp_events
  if (isFirstPass) {
    const xp = (challenge as any).xp_award ?? 50;
    try { await admin.rpc("add_xp", { p_user_id: user.id, p_amount: xp }); } catch {}
    try {
      await admin.from("xp_events").insert({
        user_id: user.id,
        amount: xp,
        reason: `nami_challenge:${challengeId}`,
        meta: { title: (challenge as any).title },
      });
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    passed,
    first_pass: isFirstPass,
    xp_awarded: isFirstPass ? (challenge as any).xp_award : 0,
  });
}
