import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AbExperimentsClient } from "./AbExperimentsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminAbPage() {
  const admin = createSupabaseAdmin();
  const { data: experiments } = await admin
    .from("ab_experiments")
    .select(`id, key, description, status, variants, goal_event, allocation, started_at, ended_at, created_at`)
    .order("created_at", { ascending: false });

  // 每個實驗的 assignment 統計（簡單版：總人數 + by variant）
  const stats: Record<string, { total: number; byVariant: Record<string, number>; conversions: Record<string, number> }> = {};
  for (const e of experiments ?? []) {
    const exp = e as any;
    stats[exp.id] = { total: 0, byVariant: {}, conversions: {} };
    const { data: assigns } = await admin
      .from("ab_assignments")
      .select("variant_key", { count: "exact" })
      .eq("experiment_id", exp.id);
    for (const a of assigns ?? []) {
      stats[exp.id].byVariant[(a as any).variant_key] = (stats[exp.id].byVariant[(a as any).variant_key] ?? 0) + 1;
      stats[exp.id].total++;
    }
    const { data: events } = await admin
      .from("ab_events")
      .select("variant_key")
      .eq("experiment_id", exp.id)
      .eq("event", "conversion")
      .limit(10000);
    for (const ev of events ?? []) {
      stats[exp.id].conversions[(ev as any).variant_key] = (stats[exp.id].conversions[(ev as any).variant_key] ?? 0) + 1;
    }
  }

  return (
    <div>
      <PageHero
        emoji="🧪"
        title="A/B 測試"
        desc="建立 / 啟動 / 暫停實驗、看 variant assignment 數 + conversion rate。code 呼叫 useAbVariant('key')。"
        gradient="from-violet-500/10 via-purple-500/10 to-pink-500/10"
        borderColor="border-violet-500/30"
      />
      <AbExperimentsClient initial={(experiments ?? []) as any} stats={stats} />
    </div>
  );
}
