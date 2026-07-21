import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { gateAiUsage } from "@/lib/ai-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/me/ai-usage
 * 目前登入者「自己的」AI 用量（近 30 天）+ 本月 token 額度。
 * 回 { quota, totals, series }。DB 出錯時回零、不讓頁面 500。
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 近 30 天（含今天 → today-29）
  const since = new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);

  // 額度（gateAiUsage 只讀不扣；特權/Premium 沒有 cap 欄位）
  let quota = { cap: null as number | null, used: 0, remaining: null as number | null, unlimited: false, isPremium: false };
  try {
    const g = await gateAiUsage(user.id);
    quota = {
      cap: g.cap ?? null,
      used: g.used ?? 0,
      remaining: g.remaining ?? null,
      unlimited: !!g.unlimited,
      isPremium: !!g.isPremium,
    };
  } catch {}

  // 用量：service role 讀，但嚴格用 user_id 過濾（只撈自己的）
  let rows: any[] = [];
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("ai_usage_daily")
      .select("date, tokens_input, tokens_output, cost_usd, message_count")
      .eq("user_id", user.id)
      .gte("date", since)
      .order("date", { ascending: true });
    if (!error && data) rows = data;
  } catch {}

  // 聚合成每日序列
  const byDate: Record<string, { date: string; tokens: number; cost: number; calls: number }> = {};
  for (const r of rows) {
    const d = r.date as string;
    if (!byDate[d]) byDate[d] = { date: d, tokens: 0, cost: 0, calls: 0 };
    byDate[d].tokens += (Number(r.tokens_input) || 0) + (Number(r.tokens_output) || 0);
    byDate[d].cost += Number(r.cost_usd) || 0;
    byDate[d].calls += Number(r.message_count) || 0;
  }
  const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  const totals = {
    totalTokens: series.reduce((s, d) => s + d.tokens, 0),
    totalCostUsd: series.reduce((s, d) => s + d.cost, 0),
    totalCalls: series.reduce((s, d) => s + d.calls, 0),
    days: series.length,
  };

  return NextResponse.json({ quota, totals, series });
}
