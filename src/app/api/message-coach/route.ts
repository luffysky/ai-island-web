import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { hasAiUnlimited } from "@/lib/ai-privilege";
import { getUserSubTier } from "@/lib/payments/orders";
import {
  getScenario, getTone, buildCoachPrompt, parseCoachVersions,
  MC_MAX_POINTS, MC_FREE_DAILY, type CoachVersion,
} from "@/lib/message-coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function taipeiMidnightUtcISO(): string {
  const nowTw = new Date(Date.now() + 8 * 3600_000);
  const ms = Date.UTC(nowTw.getUTCFullYear(), nowTw.getUTCMonth(), nowTw.getUTCDate()) - 8 * 3600_000;
  return new Date(ms).toISOString();
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = rateLimit(`msgcoach:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "太快了，稍等一下再試。" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const scenario = getScenario(String(body.scenario ?? ""));
  const tone = getTone(String(body.tone ?? ""));
  const points = String(body.points ?? "").trim().slice(0, MC_MAX_POINTS);
  const refine = typeof body.refine === "string" ? body.refine.slice(0, 200) : undefined;

  if (!scenario) return NextResponse.json({ error: "invalid_scenario", message: "情境不對，重選一個。" }, { status: 400 });
  if (!tone) return NextResponse.json({ error: "invalid_tone", message: "語氣不對，重選一個。" }, { status: 400 });
  if (!points) return NextResponse.json({ error: "empty_points", message: "先寫一下你想表達的重點。" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 付費/特權 → 無限；否則免費每日 MC_FREE_DAILY 則
  const [unlimited, subTier] = await Promise.all([
    hasAiUnlimited(user.id),
    getUserSubTier(user.id),
  ]);
  const paid = unlimited || !!subTier;

  let usedToday = 0;
  if (!paid) {
    const { count } = await admin
      .from("message_coach_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", taipeiMidnightUtcISO());
    usedToday = count ?? 0;
    if (usedToday >= MC_FREE_DAILY) {
      return NextResponse.json({
        error: "daily_cap",
        message: `今天的免費 ${MC_FREE_DAILY} 則用完了。明天再來，或升級無限使用。`,
        remaining: 0,
      }, { status: 429 });
    }
  }

  // 生成
  let versions: CoachVersion[] = [];
  try {
    const { system, user: userPrompt } = buildCoachPrompt({ scenario, tone, points }, refine);
    const res = await completeForUsage("message_coach", {
      system, user: userPrompt, maxTokens: 900, temperature: 0.8,
    });
    versions = parseCoachVersions(res.text);
  } catch {
    versions = [];
  }

  if (!versions.length) {
    return NextResponse.json({ error: "gen_failed", message: "軍師卡住了，換個說法再試一次。" }, { status: 502 });
  }

  // 記帳（一列、不存內容）
  await admin.from("message_coach_logs").insert({
    user_id: user.id, scenario: scenario.id, tone: tone.id,
  }).then(() => {}, () => {});

  const remaining = paid ? null : Math.max(0, MC_FREE_DAILY - (usedToday + 1));
  return NextResponse.json({ versions, remaining, unlimited: paid });
}
