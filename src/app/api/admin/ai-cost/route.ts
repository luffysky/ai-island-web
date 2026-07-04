import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/ai-cost?days=30
 * 撈 ai_usage_daily、算 unit economics
 *
 * 回:
 *   - summary: 總成本 / 總 tokens / 總 user
 *   - by_segment: { free, monthly, yearly } 各自的平均月燒
 *   - top_spenders: TOP 10 user 月燒
 *   - cost_by_model: 各 model 用量 / 成本
 *   - breakeven: 月訂 NT$ 299 ~ $9.5 USD、breakeven token 數
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const days = Math.max(7, Math.min(90, Number(req.nextUrl.searchParams.get("days") ?? 30)));
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

  const admin = createSupabaseAdmin();

  // 撈期間內所有 ai_usage_daily
  const { data: usage } = await admin
    .from("ai_usage_daily")
    .select("user_id, provider, tokens_input, tokens_output, cost_usd, message_count")
    .gte("date", since);

  const rows = (usage ?? []) as any[];

  // 聚合 per user
  const byUser: Record<string, { input: number; output: number; cost: number; msgs: number }> = {};
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;
  for (const r of rows) {
    if (!r.user_id) continue;
    if (!byUser[r.user_id]) byUser[r.user_id] = { input: 0, output: 0, cost: 0, msgs: 0 };
    byUser[r.user_id].input += r.tokens_input ?? 0;
    byUser[r.user_id].output += r.tokens_output ?? 0;
    byUser[r.user_id].cost += Number(r.cost_usd ?? 0);
    byUser[r.user_id].msgs += r.message_count ?? 0;
    totalCost += Number(r.cost_usd ?? 0);
    totalInput += r.tokens_input ?? 0;
    totalOutput += r.tokens_output ?? 0;
  }

  const userIds = Object.keys(byUser);
  // 抓 user 訂閱 status + name
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const profMap: Record<string, any> = {};
  for (const p of (profiles ?? []) as any[]) profMap[p.id] = p;

  // 抓所有 active subscriptions
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, plan, status")
    .eq("status", "active")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const subMap: Record<string, string> = {};
  for (const s of (subs ?? []) as any[]) subMap[s.user_id] = s.plan;

  // segment
  const segments: Record<string, { count: number; total_cost: number; total_msgs: number }> = {
    free: { count: 0, total_cost: 0, total_msgs: 0 },
    monthly: { count: 0, total_cost: 0, total_msgs: 0 },
    yearly: { count: 0, total_cost: 0, total_msgs: 0 },
  };
  for (const [uid, u] of Object.entries(byUser)) {
    const plan = subMap[uid] ?? "free";
    const seg = ["monthly", "yearly"].includes(plan) ? plan : "free";
    segments[seg].count++;
    segments[seg].total_cost += u.cost;
    segments[seg].total_msgs += u.msgs;
  }
  const bySegment: any = {};
  for (const [name, s] of Object.entries(segments)) {
    bySegment[name] = {
      users: s.count,
      total_cost_usd: Math.round(s.total_cost * 100) / 100,
      avg_cost_per_user_usd: s.count > 0 ? Math.round((s.total_cost / s.count) * 100) / 100 : 0,
      total_msgs: s.total_msgs,
      avg_msgs_per_user: s.count > 0 ? Math.round(s.total_msgs / s.count) : 0,
    };
  }

  // top spenders
  const topSpenders = Object.entries(byUser)
    .map(([uid, u]) => ({
      user_id: uid,
      name: profMap[uid]?.display_name || profMap[uid]?.username || `user-${uid.slice(0, 6)}`,
      plan: subMap[uid] ?? "free",
      cost_usd: Math.round(u.cost * 100) / 100,
      tokens_total: u.input + u.output,
      msgs: u.msgs,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 10);

  // breakeven 的「商業假設」值可由 app_settings 覆寫（否則用預設）。這些是假設、非實測；
  // 實際 AI 成本（actual_avg_cost）才是量測值。
  const { data: pricingRows } = await admin.from("app_settings").select("key, value")
    .in("key", ["pricing_monthly_twd", "pricing_yearly_twd", "pricing_usd_twd_rate", "pricing_gross_margin"]);
  const pMap = new Map(((pricingRows as any[]) ?? []).map((r) => [r.key, r.value]));
  const num = (k: string, d: number) => { const v = Number(pMap.get(k)); return Number.isFinite(v) && v > 0 ? v : d; };
  const monthlyTwd = num("pricing_monthly_twd", 299);
  const yearlyTwd = num("pricing_yearly_twd", 2999);
  const usdTwdRate = num("pricing_usd_twd_rate", 31.5);
  const grossMarginTarget = num("pricing_gross_margin", 0.7);
  const monthlyPriceUsd = monthlyTwd / usdTwdRate;
  const yearlyPriceUsd = yearlyTwd / usdTwdRate / 12;
  const breakeven = {
    assumptions: { monthly_twd: monthlyTwd, yearly_twd: yearlyTwd, usd_twd_rate: usdTwdRate, gross_margin_target: grossMarginTarget, note: "商業假設值，可在 app_settings 調整（pricing_*）；actual_avg_cost 才是實測" },
    monthly_plan: {
      revenue_usd: Math.round(monthlyPriceUsd * 100) / 100,
      ai_budget_70pct_margin: Math.round(monthlyPriceUsd * (1 - grossMarginTarget) * 100) / 100,
      actual_avg_cost: bySegment.monthly.avg_cost_per_user_usd,
      status: bySegment.monthly.avg_cost_per_user_usd <= monthlyPriceUsd * (1 - grossMarginTarget) ? "good" : "above_budget",
    },
    yearly_plan: {
      revenue_usd: Math.round(yearlyPriceUsd * 100) / 100,
      ai_budget_70pct_margin: Math.round(yearlyPriceUsd * (1 - grossMarginTarget) * 100) / 100,
      actual_avg_cost: bySegment.yearly.avg_cost_per_user_usd,
      status: bySegment.yearly.avg_cost_per_user_usd <= yearlyPriceUsd * (1 - grossMarginTarget) ? "good" : "above_budget",
    },
  };

  return NextResponse.json({
    ok: true,
    period_days: days,
    summary: {
      total_users: userIds.length,
      total_cost_usd: Math.round(totalCost * 100) / 100,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      total_msgs: rows.reduce((s, r) => s + (r.message_count ?? 0), 0),
    },
    by_segment: bySegment,
    top_spenders: topSpenders,
    breakeven,
  });
}
