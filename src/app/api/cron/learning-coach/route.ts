import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { rateLimit } from "@/lib/rate-limit";
import { computeCoachReport, getLatestCoachReport, weekStartOf } from "@/lib/learning-coach";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_CAP = 60;              // 每次 cron 最多產幾份（控成本 / 時間）
const ACTIVE_WINDOW_DAYS = 7;      // 「近期活躍」定義

/** 是否帶了 cron secret（三種 input 任一）→ 判斷這是 cron 還是登入使用者請求。 */
function hasCronSecretAttempt(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return (
    auth.startsWith("Bearer ") ||
    !!req.headers.get("x-cron-secret") ||
    req.nextUrl.searchParams.has("secret")
  );
}

/**
 * GET
 *  - 帶 CRON_SECRET → 批次：為近期活躍學員重新產生本週報告（cap + skipInactive）
 *  - 登入使用者（不帶 secret）→ 回自己最新一份報告（唯讀、不呼叫 AI）
 */
export async function GET(req: NextRequest) {
  if (hasCronSecretAttempt(req)) {
    const guard = verifyCronAuth(req);
    if (guard) return guard;
    return runBatch();
  }

  // 登入使用者讀最新報告
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const latest = await getLatestCoachReport(user.id);
  return NextResponse.json({ ok: true, latest, weekStart: weekStartOf() });
}

/**
 * POST — 登入使用者 on-demand：即時重新產生自己本週報告（限流）。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 限流：每人每 5 分鐘最多 5 次重新產生
  const rl = rateLimit(`learning-coach:${user.id}`, 5, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429 },
    );
  }

  try {
    const result = await computeCoachReport(user.id);
    if (!result) {
      return NextResponse.json({ ok: true, report: null, message: "這週還沒有學習紀錄" });
    }
    return NextResponse.json({
      ok: true,
      report: result.report,
      weekStart: result.weekStart,
      fellBack: result.fellBack,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "coach_failed", message: e?.message ?? "產生報告失敗、請稍後再試" },
      { status: 500 },
    );
  }
}

/** cron 批次：撈近期活躍學員、逐一產生本週報告。個別失敗不阻斷。 */
async function runBatch() {
  const admin = createSupabaseAdmin();
  const weekStart = weekStartOf();
  const sinceIso = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: targets, error } = await admin
    .from("profiles")
    .select("id, last_active_at")
    .gte("last_active_at", sinceIso)
    .is("banned_at", null)
    .is("deleted_at", null)
    .order("last_active_at", { ascending: false })
    .limit(BATCH_CAP);

  if (error) {
    return NextResponse.json({ error: "profiles_query_failed", message: error.message }, { status: 500 });
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of (targets as any[]) ?? []) {
    try {
      const r = await computeCoachReport(p.id, { weekStart, skipInactive: true });
      if (r) generated++;
      else skipped++;
    } catch (e: any) {
      failed++;
      console.warn(`[cron-learning-coach] user ${p.id} failed:`, e?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    week_start: weekStart,
    total_targets: (targets as any[])?.length ?? 0,
    generated,
    skipped_inactive: skipped,
    failed,
  });
}
