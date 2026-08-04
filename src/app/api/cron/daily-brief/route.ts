import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { buildDailyBrief } from "@/lib/daily-brief";
import { notifyUserLine } from "@/lib/notify-user-line";
import { buildListCard } from "@/lib/line-flex";
import { getCityWeather, deterministicAdvice, type DailyWeather } from "@/lib/weather";
import { generateFreeFortune } from "@/lib/fortune-free";
import type { Zodiac } from "@/lib/fortune";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 每日主動推播「今天值得做的 3 件事」到 LINE（opt-in）。
 * 觸發：GET /api/cron/daily-brief?secret=<CRON_SECRET>（建議每天早上一次，如 08:30）。
 * 對象：有綁 LINE + 未關總開關 + 未關「分身島」分類（line_pref_agent）的使用者。
 *   （`notifyUserLine(category:"agent")` 內部會再次核對偏好，關了就不送。）
 * 純推播、不寫任何資料；規則式產生內容、零 AI 成本。
 */
const MAX_USERS = 500; // 保護：一次最多處理的人數上限

export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const admin = createSupabaseAdmin();

  // 候選：綁了 LINE 且沒關總開關的人（分類偏好交給 notifyUserLine 再判）
  // 帶 geo 欄位：有同意定位（geo_consent_at 有、未撤回）才附天氣（§5，Open-Meteo 免費）。
  const { data: users, error } = await admin
    .from("profiles")
    .select("id, geo_city, geo_country, geo_consent_at, geo_revoked_at")
    .not("line_user_id", "is", null)
    .neq("line_notify_enabled", false)
    .limit(MAX_USERS);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // 運勢一句（零 AI）：批次撈候選者的星座，避免 N+1。
  const ids = (users ?? []).map((u) => u.id);
  const zodiacMap = new Map<string, string>();
  if (ids.length) {
    const { data: fps } = await admin.from("fortune_profiles").select("user_id, zodiac").in("user_id", ids);
    for (const f of (fps ?? []) as any[]) if (f.zodiac) zodiacMap.set(f.user_id, String(f.zodiac));
  }
  const today = new Date().toISOString().slice(0, 10);
  function fortuneLineFor(u: any): string | null {
    const z = zodiacMap.get(u.id);
    if (!z) return null;
    try {
      const f = generateFreeFortune(z as Zodiac, today);
      return `🔮 今日運勢${f.score ? ` ${f.score}分` : ""} · ${f.tip}`;
    } catch { return null; }
  }

  // 同城市天氣一天只抓一次（零成本；本次 cron run 內快取）
  const cityCache = new Map<string, DailyWeather | null>();
  async function weatherLineFor(u: any): Promise<string | null> {
    const consented = u.geo_consent_at && !u.geo_revoked_at;
    const city = String(u.geo_city ?? "").trim();
    if (!consented || !city) return null;
    const key = `${city}|${u.geo_country ?? ""}`;
    if (!cityCache.has(key)) cityCache.set(key, await getCityWeather(city, u.geo_country || undefined));
    const w = cityCache.get(key);
    if (!w) return null;
    const tip = deterministicAdvice(w)[0];
    return `☀️ ${w.place ?? city} ${w.desc} ${w.tempMin}–${w.tempMax}°C · ${tip}`;
  }

  let sent = 0, skipped = 0, failed = 0;
  for (const u of users ?? []) {
    try {
      const items = await buildDailyBrief(u.id);
      if (!items.length) { skipped++; continue; }
      const weather = await weatherLineFor(u).catch(() => null);  // 天氣失敗絕不擋晨報
      const fortune = fortuneLineFor(u);                          // 運勢一句（零 AI、有星座才有）
      const head = [weather, fortune].filter(Boolean) as string[];
      const listItems = [...head.map((s) => ({ primary: s })), ...items.map((s) => ({ primary: s }))];
      const textLines = [...head, ...items.map((s, i) => `${i + 1}. ${s}`)].filter(Boolean);
      const text = `🌅 今日晨報\n\n${textLines.join("\n")}\n\n（不想收：設定 → 通知偏好可關）`;
      // 美化：改推 Flex 列表卡（天氣 + 今天值得做的 3 件事 + 打開 AI 島按鈕）
      const flex = buildListCard({
        title: "今日晨報",
        emoji: "🌅",
        items: listItems,
        footerButton: { label: "☀️ 打開 AI 島", uri: SITE_URL },
        accentColor: "#f59e0b",
      });
      const r = await notifyUserLine({ userId: u.id, text, flex, category: "agent" });
      if (r.ok) sent++;
      else if (r.reason === "category_disabled" || r.reason === "user_disabled" || r.reason === "not_bound") skipped++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, candidates: users?.length ?? 0, sent, skipped, failed });
}
