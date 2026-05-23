import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 每日 LINE push 報表
 *
 * 用外部 cron 觸發（GitHub Actions / Zeabur cron / cron-job.org / EasyCron）：
 *   GET https://你的網站/api/cron/line-daily?period=daily
 *   Header: x-cron-secret: ${CRON_SECRET}
 *
 * period:
 *   daily  → 昨日報表（每天早上 9:00 推一次）
 *   weekly → 上週 7 天報表（每週一早上推）
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const period = (req.nextUrl.searchParams.get("period") ?? "daily") as "daily" | "weekly";
  const days = period === "weekly" ? 7 : 1;
  const label = period === "weekly" ? "上週" : "昨日";

  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [{ count: signups }, { count: dau }, { count: wau }, { count: subs }, { data: lessons }, { data: orders }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", new Date(Date.now() - 86400_000).toISOString()).is("banned_at", null),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", new Date(Date.now() - 7 * 86400_000).toISOString()).is("banned_at", null),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("lesson_progress").select("user_id").gte("completed_at", since).limit(50000),
    admin.from("orders").select("amount_twd").eq("status", "paid").gte("created_at", since),
  ] as any);

  const revenue = ((orders as any[]) ?? []).reduce((s, o: any) => s + Number(o.amount_twd ?? 0), 0);
  const lessonCount = (lessons as any[])?.length ?? 0;
  const activeUsers = new Set(((lessons as any[]) ?? []).map((l: any) => l.user_id)).size;

  const text = [
    `📊 ${label}報表（${period === "weekly" ? "近 7 天" : "昨日"}）`,
    `👤 新註冊：${signups ?? 0}`,
    `🟢 DAU：${dau ?? 0} · WAU：${wau ?? 0}`,
    `💎 活躍訂閱：${subs ?? 0}`,
    `📚 完成 lesson：${lessonCount} 次 / ${activeUsers} 人`,
    `💰 收入：NT$ ${revenue.toLocaleString()}`,
    ``,
    `🔍 想看更細：LINE 對 bot 傳 /kpi ${days}`,
  ].join("\n");

  await notifyAdmin({
    kind: `cron_${period}`,
    dedupeKey: `cron:${period}:${new Date().toISOString().slice(0, 10)}`,
    text,
  });

  return NextResponse.json({ ok: true, period, sent_text: text });
}
