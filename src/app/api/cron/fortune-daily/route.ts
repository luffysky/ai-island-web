import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { notifyUserLine } from "@/lib/notify-user-line";
import { getOrCreateDailyFortune, taipeiToday } from "@/lib/fortune-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 每日運勢 LINE 推播 — 給「填過生日 + 綁了 LINE + 開啟運勢推播」的 user 推今日運勢。
 *
 * 觸發：GET /api/cron/fortune-daily?secret=$CRON_SECRET
 * 建議排程：每天 00:00 UTC（= 台灣 08:00）
 *
 * 條件：profiles.line_user_id 有值 + line_notify_enabled + line_pref_fortune
 *       且 fortune_profiles 有生日資料（inner join）。
 * dedupe：同日只推一次（查 notifications 今天是否已有運勢推播）。
 * batch cap：一次最多 500 人。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const date = taipeiToday();
  const TW_OFFSET = 8 * 3600_000;
  const nowTw = new Date(Date.now() + TW_OFFSET);
  const twMidnightUtc = new Date(Date.UTC(nowTw.getUTCFullYear(), nowTw.getUTCMonth(), nowTw.getUTCDate()) - TW_OFFSET);

  const CAP = 500;

  // 綁了 LINE + 開推播 + 有填生日（inner join fortune_profiles）
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, fortune_profiles!inner(user_id)")
    .not("line_user_id", "is", null)
    .eq("line_notify_enabled", true)
    .eq("line_pref_fortune", true)
    .limit(CAP);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const candidates = (rows ?? []) as any[];
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, pushed: 0, message: "沒有開啟運勢推播的綁定用戶" });
  }

  let pushed = 0, skipped = 0, noProfile = 0, failed = 0;

  for (const u of candidates) {
    // dedupe：今天已推過就 skip
    const { count: already } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .eq("kind", "system")
      .ilike("title", "%今日運勢%")
      .gte("created_at", twMidnightUtc.toISOString());
    if ((already ?? 0) > 0) { skipped++; continue; }

    const result = await getOrCreateDailyFortune(admin, u.id, date);
    if (!result) { noProfile++; continue; }

    const f = result.fortune;
    const text = [
      `${result.zodiacEmoji} ${result.zodiacZh}．今日運勢（${date}）`,
      "",
      `整體：${f.overall}`,
      `💗 愛情：${f.love}`,
      `💼 事業：${f.career}`,
      `💰 財運：${f.wealth}`,
      "",
      `🎨 幸運色 ${f.luckyColor}　🔢 幸運數字 ${f.luckyNumber}`,
      `💡 ${f.tip}`,
      "",
      "看完整運勢 → ai-island-web.snowrealm.pet/fortune",
    ].join("\n");

    const sent = await notifyUserLine({ userId: u.id, text, category: "fortune" });
    if (!sent.ok) { failed++; continue; }

    // 站內鈴鐺留一筆 + 當 dedupe 標記
    await admin.from("notifications").insert({
      user_id: u.id,
      kind: "system",
      title: `今日運勢已送出（${result.zodiacZh}）`,
      body: f.overall,
      link: "/fortune",
    }).then(() => {}, () => {});

    pushed++;
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, pushed, skipped, noProfile, failed });
}
