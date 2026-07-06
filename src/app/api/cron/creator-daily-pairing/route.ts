import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { pushUserNotif } from "@/lib/notify-helpers";
import { sendPushToUser } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 今日 AI 配對每日推播：提醒有累積碎片的創作者「今天的配對更新了」，把人帶回島上。
 * 具體配對在創作島首頁上站卡即時算（依日期決定性）；這裡只發回訪提醒。
 * 觸發：GET + CRON_SECRET。建議每日一次（配合台灣白天）。
 */
export async function GET(req: NextRequest) {
  const guard = verifyCronAuth(req);
  if (guard) return guard;
  const admin = createSupabaseAdmin();

  // 活躍創作者：碎片數 >= 8（有東西可配）。分頁 tally created_by。
  const counts = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; from < 12000; from += PAGE) {
    const { data } = await admin.from("ci_fragments").select("created_by").not("created_by", "is", null).range(from, from + PAGE - 1);
    const rows = (data as any[]) ?? [];
    for (const r of rows) counts.set(r.created_by, (counts.get(r.created_by) ?? 0) + 1);
    if (rows.length < PAGE) break;
  }
  const users = [...counts.entries()].filter(([, n]) => n >= 8).map(([id]) => id).slice(0, 500);

  let notified = 0;
  for (const uid of users) {
    await pushUserNotif({ userId: uid, kind: "system", title: "🎲 今日 AI 配對", body: "AI 幫你的碎片撞出新組合了，來島上看看今天寫什麼？", link: "/creator-island" });
    void sendPushToUser(uid, { title: "🎲 今日 AI 配對", body: "AI 幫你的碎片撞出新組合了，來看看", url: "/creator-island", tag: "daily-pairing" });
    notified++;
  }
  return NextResponse.json({ ok: true, eligible: users.length, notified });
}
