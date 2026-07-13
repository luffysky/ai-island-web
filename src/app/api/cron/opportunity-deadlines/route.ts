import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { pushUserNotif } from "@/lib/notify-helpers";
import { notifyUserLine } from "@/lib/notify-user-line";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * 機會島截止提醒 —— 掃使用者「我的航線」(opportunity_routes) 裡收藏的機會，
 * 距報名截止 30/14/7/3/1 天時，發 in-app 鈴鐺通知 + LINE（綁定才送）。
 *
 * 觸發：GET /api/cron/opportunity-deadlines?secret=<CRON_SECRET>（建議每天一次，如台灣 09:00）。
 * 冪等：同一機會 20 小時內已通知過就跳過（避免一天多跑重複轟炸）。
 * 只提醒 open/upcoming 的機會；已截止/已關閉不提醒。
 */
const MILESTONES = new Set([30, 14, 7, 3, 1]);

function daysLeft(deadline: string): number {
  const end = new Date(deadline + "T23:59:59+08:00").getTime();
  return Math.ceil((end - Date.now()) / 86400_000);
}

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const admin = createSupabaseAdmin();

  const { data: routes } = await admin.from("opportunity_routes")
    .select("user_id, opportunity_id").limit(2000);
  if (!routes || routes.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "no routes" });

  // 撈這些機會的截止日/狀態
  const oppIds = [...new Set(routes.map((r) => r.opportunity_id).filter(Boolean))];
  const { data: opps } = await admin.from("opportunities")
    .select("id, name, application_deadline, status").in("id", oppIds);
  const oppMap = new Map((opps ?? []).map((o) => [o.id, o]));

  const dedupeCutoff = new Date(Date.now() - 20 * 3600_000).toISOString();
  let sent = 0;
  const results: { user: string; opp: string; days: number }[] = [];

  for (const r of routes) {
    const o = oppMap.get(r.opportunity_id);
    if (!o || !o.application_deadline) continue;
    if (o.status === "closed") continue;
    const dl = daysLeft(o.application_deadline);
    if (!MILESTONES.has(dl)) continue;

    // 冪等：這位使用者、這個機會，最近 20h 內已通知過就跳過
    const link = `/opportunities/${o.id}`;
    const { data: recent } = await admin.from("notifications")
      .select("id").eq("user_id", r.user_id).eq("link", link)
      .gte("created_at", dedupeCutoff).limit(1);
    if (recent && recent.length) continue;

    const title = dl === 1 ? `⏰ 明天截止：${o.name}` : `⏰ 剩 ${dl} 天截止：${o.name}`;
    const body = `你收藏的機會「${o.name}」報名截止 ${o.application_deadline}，剩 ${dl} 天。要不要現在準備？`;
    await pushUserNotif({ userId: r.user_id, kind: "system", title, body, link });
    notifyUserLine({ userId: r.user_id, text: `${title}\n報名截止 ${o.application_deadline}（剩 ${dl} 天）\n${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}${link}` }).catch(() => {});
    sent++;
    results.push({ user: r.user_id.slice(0, 8), opp: o.name, days: dl });
  }

  // === 機會訂閱：有「新符合條件」的機會就推播（in-app + LINE）===
  let subSent = 0;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const { data: subs } = await admin.from("opportunity_subscriptions")
    .select("id, user_id, label, keywords, categories, free_only, min_prize, last_checked_at").eq("enabled", true).limit(500);
  if (subs && subs.length) {
    // 一次撈近 30 天新增的 open/upcoming 機會，各訂閱在記憶體比對（省查詢）
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: fresh } = await admin.from("opportunities")
      .select("id, name, category, organizer, is_free, prize_amount, created_at")
      .in("status", ["open", "upcoming"]).gte("created_at", since);
    const pool = (fresh ?? []) as any[];
    const nowIso = new Date().toISOString();
    for (const s of subs) {
      const cats = (s.categories as string[]) ?? [];
      const kw = String(s.keywords ?? "").toLowerCase();
      const matched = pool.filter((o) => {
        if (o.created_at <= s.last_checked_at) return false;                 // 只算比上次檢查更新的
        if (s.free_only && !o.is_free) return false;
        if (s.min_prize != null && (o.prize_amount ?? 0) < Number(s.min_prize)) return false;
        if (cats.length && !cats.some((c) => String(o.category ?? "").includes(c))) return false;
        if (kw) {
          const hay = `${o.name ?? ""} ${o.category ?? ""} ${o.organizer ?? ""}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      });
      // 不管有沒有中，都把 last_checked_at 往前推（避免下次重算舊的）
      await admin.from("opportunity_subscriptions").update({ last_checked_at: nowIso }).eq("id", s.id);
      if (!matched.length) continue;
      const names = matched.slice(0, 5).map((o) => `• ${o.name}`).join("\n");
      const title = `🔔 ${matched.length} 個新機會符合你的訂閱`;
      const body = `符合「${s.label}」：\n${names}${matched.length > 5 ? `\n…等 ${matched.length} 個` : ""}`;
      await pushUserNotif({ userId: s.user_id, kind: "system", title, body, link: "/opportunities" });
      notifyUserLine({ userId: s.user_id, text: `${title}\n${body}\n${site}/opportunities` }).catch(() => {});
      subSent++;
    }
  }

  return NextResponse.json({ ok: true, routes: routes.length, sent, subscriptionsNotified: subSent, results });
}
