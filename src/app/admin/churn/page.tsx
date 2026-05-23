import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ChurnClient } from "./ChurnClient";

export const dynamic = "force-dynamic";

export default async function AdminChurnPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; min_xp?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.max(1, parseInt(sp.days ?? "7", 10) || 7);
  const minXp = Math.max(0, parseInt(sp.min_xp ?? "100", 10) || 100);

  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  const admin = createSupabaseAdmin();

  const { data: users, count } = await admin
    .from("profiles")
    .select(`id, username, display_name, avatar_url, xp, level, z_coin, streak_days, last_active_at, created_at, role`, { count: "exact" })
    .gte("xp", minXp)
    .or(`last_active_at.lt.${cutoff},last_active_at.is.null`)
    .is("banned_at", null)
    .order("xp", { ascending: false })
    .limit(200);

  // 三段：7 天 / 14 天 / 30 天
  const segments = [
    { days: 7, label: "7 天沒回" },
    { days: 14, label: "14 天沒回" },
    { days: 30, label: "30 天沒回" },
  ];
  const counts: Record<number, number> = {};
  for (const s of segments) {
    const c = new Date(Date.now() - s.days * 86400_000).toISOString();
    const { count: n } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("xp", 100)
      .or(`last_active_at.lt.${c},last_active_at.is.null`)
      .is("banned_at", null);
    counts[s.days] = n ?? 0;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🚨 流失預警</h1>
        <p className="text-sm text-fg-muted mt-1">
          高價值用戶（XP ≥ 100）但久未活躍。可批次匯出 CSV 給行銷召回。
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {segments.map((s) => (
          <a key={s.days} href={`?days=${s.days}&min_xp=${minXp}`} className="block">
            <div className={`rounded-xl bg-bg-card border ${days === s.days ? "border-accent" : "border-border"} p-4 hover:border-accent transition`}>
              <div className="text-xs text-fg-muted">{s.label}</div>
              <div className="text-2xl font-bold mt-1 text-warning">{(counts[s.days] ?? 0).toLocaleString()}</div>
            </div>
          </a>
        ))}
      </div>

      <ChurnClient users={(users ?? []) as any} filterDays={days} filterMinXp={minXp} total={count ?? 0} />
    </div>
  );
}
