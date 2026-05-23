import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AbExperimentsClient } from "./AbExperimentsClient";

export const dynamic = "force-dynamic";

export default async function AdminAbPage() {
  const admin = createSupabaseAdmin();
  const { data: experiments } = await admin
    .from("ab_experiments")
    .select(`id, key, description, status, variants, goal_event, started_at, ended_at, created_at`)
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
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🧪 A/B 測試</h1>
        <p className="text-sm text-fg-muted mt-1">
          建立 / 啟動 / 暫停實驗、看 variant assignment 數 + conversion rate。<br/>
          開發者使用：在程式碼中呼叫 <code className="bg-bg-elevated px-1 rounded">useAbVariant("experiment-key")</code> 取得 variant。
        </p>
      </header>
      <AbExperimentsClient initial={(experiments ?? []) as any} stats={stats} />
    </div>
  );
}
