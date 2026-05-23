import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchLeetcodeStats } from "@/lib/leetcode-stats";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET — 拿目前綁定的 username + 最新 stats（cache 1 小時）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("leetcode_username, leetcode_stats, leetcode_stats_at").eq("id", user.id).single();
  const username = (profile as any)?.leetcode_username ?? null;
  if (!username) return NextResponse.json({ username: null, stats: null });
  const last = (profile as any)?.leetcode_stats_at ? new Date((profile as any).leetcode_stats_at).getTime() : 0;
  if (Date.now() - last < 3600_000) {
    return NextResponse.json({ username, stats: (profile as any).leetcode_stats });
  }
  // 過期、重抓
  const stats = await fetchLeetcodeStats(username);
  if ("error" in stats) return NextResponse.json({ username, stats: (profile as any).leetcode_stats, error: stats.error });
  await admin.from("profiles").update({ leetcode_stats: stats, leetcode_stats_at: new Date().toISOString() }).eq("id", user.id);
  return NextResponse.json({ username, stats });
}

// POST { username } — 綁定 + 立刻抓
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rl = rateLimit(`leetcode:bind:${user.id}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const username = String(body.username ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(username)) return NextResponse.json({ error: "invalid_username" }, { status: 400 });

  const stats = await fetchLeetcodeStats(username);
  if ("error" in stats) return NextResponse.json({ error: stats.error }, { status: 400 });

  const admin = createSupabaseAdmin();
  await admin.from("profiles").update({
    leetcode_username: username,
    leetcode_stats: stats,
    leetcode_stats_at: new Date().toISOString(),
  }).eq("id", user.id);
  return NextResponse.json({ ok: true, username, stats });
}

// DELETE — 解除綁定
export async function DELETE() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  await admin.from("profiles").update({ leetcode_username: null, leetcode_stats: null, leetcode_stats_at: null }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
