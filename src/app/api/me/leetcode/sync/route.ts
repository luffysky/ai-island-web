import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchLeetcodeStats } from "@/lib/leetcode-stats";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * 同步 leetcode 解題狀態：
 *  - 比對 leetcode-stats-api totalSolved 跟上次的差、若 +N 表示新解了 N 題
 *  - 但 API 不告訴我們「解了哪題」、所以這裡只做：拿 stats、更新個資、回報差
 *  - 真正標哪題已解、用戶要在 /me/leetcode 自己點「✓ 解過了」
 */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rl = rateLimit(`leetcode:sync:${user.id}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("leetcode_username, leetcode_stats")
    .eq("id", user.id)
    .single();
  const username = (profile as any)?.leetcode_username;
  if (!username) return NextResponse.json({ error: "no_binding" }, { status: 400 });

  const prevTotal = (profile as any)?.leetcode_stats?.totalSolved ?? 0;
  const stats = await fetchLeetcodeStats(username);
  if ("error" in stats) return NextResponse.json({ error: stats.error }, { status: 502 });
  const added = Math.max(0, stats.totalSolved - prevTotal);

  await admin.from("profiles").update({
    leetcode_stats: stats,
    leetcode_stats_at: new Date().toISOString(),
  }).eq("id", user.id);

  return NextResponse.json({ ok: true, added, totalSolved: stats.totalSolved, prevTotal });
}
