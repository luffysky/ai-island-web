import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/**
 * Nami 挑戰提交
 *   POST { challenge_id, code, passed: boolean, error?: string }
 *   client 端在 Pyodide 跑完 user_code + test_code、回報結果。
 *   server 寫 progress、若 passed 第一次、發 XP。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
    .eq("user_id", gate.userId)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  const isFirstPass = passed && existing?.status !== "passed";

  // upsert
  await admin.from("nami_challenge_progress").upsert(
    {
      user_id: gate.userId,
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
    // add_xp RPC 不存在（DB 沒這支）→ 直接更新 profile（service role 跳 field_lock），
    // 對齊 /api/admin/grant/xp 的 Lv 公式；原本 rpc 呼叫被 try/catch 吞掉、XP 從沒真的加上去。
    try {
      const { data: prof } = await admin
        .from("profiles")
        .select("xp")
        .eq("id", gate.userId)
        .maybeSingle();
      const newXp = Math.max(0, ((prof as any)?.xp ?? 0) + xp);
      // profiles.level 是 GENERATED 欄位、不能寫 → 只更新 xp
      await admin.from("profiles").update({ xp: newXp }).eq("id", gate.userId);
    } catch {}
    try {
      await admin.from("xp_events").insert({
        user_id: gate.userId,
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
