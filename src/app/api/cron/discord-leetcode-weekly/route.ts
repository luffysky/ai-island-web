import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Leetcode 週排行 Discord post — 每週一台灣 09:00 公布上週 + 總榜 Top
 *
 * 觸發：GET /api/cron/discord-leetcode-weekly?secret=$CRON_SECRET
 * 排程：cron-job.org 每週一 01:00 UTC (= 台灣 09:00)
 *
 * Env: DISCORD_LEETCODE_WEBHOOK_URL（沒設就 fallback DISCORD_ACHIEVEMENTS_WEBHOOK_URL、再沒就 noop）
 *
 * 兩個榜：
 *   1. 本週解最多題 Top 5（過去 7 天 user_leetcode_solved COUNT）
 *   2. 累計解題總榜 Top 5（profiles.leetcode_stats.totalSolved）
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_LEETCODE_WEBHOOK_URL || process.env.DISCORD_ACHIEVEMENTS_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: "no Discord webhook env set" });
  }

  const admin = createSupabaseAdmin();
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();

  // 1. 本週解題榜（user_leetcode_solved 過去 7 天）
  const { data: weeklyRaw } = await admin
    .from("user_leetcode_solved")
    .select("user_id")
    .gte("solved_at", since7d);

  const weeklyCount: Record<string, number> = {};
  for (const r of (weeklyRaw ?? []) as any[]) {
    weeklyCount[r.user_id] = (weeklyCount[r.user_id] ?? 0) + 1;
  }
  const weeklyTop = Object.entries(weeklyCount)
    .map(([uid, n]) => ({ uid, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  // 2. 累計解題榜（profiles.leetcode_stats.totalSolved 直接 sort）
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("id, username, display_name, leetcode_username, leetcode_stats")
    .not("leetcode_username", "is", null)
    .limit(200);

  const totalTop = ((allProfiles ?? []) as any[])
    .map((p) => ({
      uid: p.id,
      name: p.display_name || p.username || `user-${p.id.slice(0, 6)}`,
      lcUsername: p.leetcode_username,
      total: Number(p.leetcode_stats?.totalSolved ?? 0),
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 補本週榜的 name
  const weeklyUserIds = weeklyTop.map((x) => x.uid);
  const { data: weeklyProfs } = await admin
    .from("profiles")
    .select("id, username, display_name, leetcode_username")
    .in("id", weeklyUserIds.length > 0 ? weeklyUserIds : ["00000000-0000-0000-0000-000000000000"]);
  const profMap: Record<string, any> = {};
  for (const p of (weeklyProfs ?? []) as any[]) profMap[p.id] = p;

  const weeklyLines = weeklyTop.length > 0
    ? weeklyTop.map((x, i) => {
        const p = profMap[x.uid];
        const name = p?.display_name || p?.username || `user-${x.uid.slice(0, 6)}`;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        return `${medal} **${name}** — ${x.n} 題`;
      }).join("\n")
    : "_（本週無人解題、就你了）_";

  const totalLines = totalTop.length > 0
    ? totalTop.map((x, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        return `${medal} **${x.name}** (\`${x.lcUsername}\`) — ${x.total} 題`;
      }).join("\n")
    : "_（還沒人綁定 Leetcode、來 /me/leetcode 綁一下）_";

  const embed = {
    title: "🏆 Leetcode 週排行",
    description: "**本週解最多題 Top 5**\n" + weeklyLines + "\n\n**累計解題總榜 Top 5**\n" + totalLines,
    color: 0xfbbf24,
    footer: { text: `AI 島 · Leetcode 週榜 · 每週一 09:00 公布` },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ok: false, status: res.status, body: body.slice(0, 200) });
    }
    return NextResponse.json({
      ok: true,
      weekly_count: weeklyTop.length,
      total_count: totalTop.length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
