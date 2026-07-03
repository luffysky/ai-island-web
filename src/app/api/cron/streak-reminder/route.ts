import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendPushToUser, isPushEnabled } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 連勝快斷提醒 — 找「昨天有活動、今天還沒、streak>0」的 user、推 web push 提醒別斷連勝。
 *
 * 觸發：GET /api/cron/streak-reminder?secret=$CRON_SECRET
 * 建議排程：每天 12:00 UTC（= 台灣 20:00、晚上還來得及補今天的活動）
 *
 * 判定（台灣時區 UTC+8）：
 *   last_active_at 落在 [昨天 00:00, 今天 00:00)  → 昨天有、今天還沒
 *   streak_days > 0                              → 有連勝可斷
 *
 * dedupe：同一天只推一次（查 notifications 是否已有今天的連勝提醒）。
 * batch cap：一次最多處理 300 人。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  if (!isPushEnabled()) {
    return NextResponse.json({ ok: true, pushed: 0, message: "VAPID 未設、push 停用（no-op）" });
  }

  const admin = createSupabaseAdmin();

  // 台灣日界線 → 換算成 UTC 區間
  const TW_OFFSET = 8 * 3600_000;
  const nowTw = new Date(Date.now() + TW_OFFSET);
  const twMidnightUtcMs = Date.UTC(nowTw.getUTCFullYear(), nowTw.getUTCMonth(), nowTw.getUTCDate()) - TW_OFFSET;
  const todayStart = new Date(twMidnightUtcMs);
  const yesterdayStart = new Date(twMidnightUtcMs - 86400_000);
  const todayTag = new Date(twMidnightUtcMs).toISOString().slice(0, 10);

  const CAP = 300;

  const { data: users } = await admin
    .from("profiles")
    .select("id, username, display_name, streak_days, last_active_at")
    .gt("streak_days", 0)
    .gte("last_active_at", yesterdayStart.toISOString())
    .lt("last_active_at", todayStart.toISOString())
    .order("streak_days", { ascending: false })
    .limit(CAP);

  const candidates = (users ?? []) as any[];
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, pushed: 0, message: "沒人的連勝快斷、全員今天都活躍或已斷" });
  }

  let pushed = 0;
  let skipped = 0;

  for (const u of candidates) {
    // dedupe：今天已推過就 skip
    const { count: already } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .eq("kind", "system")
      .ilike("title", "%連勝快斷%")
      .gte("created_at", todayStart.toISOString());
    if ((already ?? 0) > 0) { skipped++; continue; }

    const streak = u.streak_days ?? 0;
    const body = `你已連續學習 ${streak} 天！今天還沒有活動、快回來保住連勝 🔥`;

    const sent = await sendPushToUser(u.id, {
      title: "你的連勝快斷了！⚡",
      body,
      url: "/chapters",
      tag: `streak-reminder:${todayTag}`,
    });

    // 站內鈴鐺也留一筆（登入也看得到、同時當 dedupe 標記）
    await admin.from("notifications").insert({
      user_id: u.id,
      kind: "system",
      title: `連勝快斷提醒（${streak} 天）`,
      body,
      link: "/chapters",
    }).then(() => {}, () => {});

    if (sent > 0) pushed++;
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    pushed,
    skipped,
    tw_window: { from: yesterdayStart.toISOString(), to: todayStart.toISOString() },
  });
}
