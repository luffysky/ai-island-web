import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type MetricStat = {
  metric: string;
  total: number;
  good: number;
  needsImprovement: number;
  poor: number;
  p50: number;
  p75: number;
  p95: number;
};

function percentile(sorted: number[], pct: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[idx];
}

export default async function AdminWebVitalsPage() {
  const admin = createSupabaseAdmin();
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: rows } = await admin
    .from("web_vitals")
    .select("metric, value, rating, page_path, device_type, recorded_at")
    .gte("recorded_at", sevenAgo)
    .order("recorded_at", { ascending: false })
    .limit(10000);

  const byMetric: Record<string, { values: number[]; ratings: Record<string, number> }> = {};
  for (const r of rows ?? []) {
    const m = (r as any).metric;
    const v = Number((r as any).value);
    const rating = (r as any).rating ?? "unknown";
    if (!byMetric[m]) byMetric[m] = { values: [], ratings: { good: 0, "needs-improvement": 0, poor: 0, unknown: 0 } };
    byMetric[m].values.push(v);
    byMetric[m].ratings[rating] = (byMetric[m].ratings[rating] ?? 0) + 1;
  }

  const stats: MetricStat[] = Object.entries(byMetric).map(([metric, d]) => {
    const sorted = [...d.values].sort((a, b) => a - b);
    return {
      metric,
      total: d.values.length,
      good: d.ratings.good ?? 0,
      needsImprovement: d.ratings["needs-improvement"] ?? 0,
      poor: d.ratings.poor ?? 0,
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p95: percentile(sorted, 95),
    };
  });

  // 最慢的頁面 top 10（poor 數）
  const pagePoor: Record<string, number> = {};
  for (const r of rows ?? []) {
    if ((r as any).rating === "poor") {
      const p = (r as any).page_path || "(unknown)";
      pagePoor[p] = (pagePoor[p] ?? 0) + 1;
    }
  }
  const worstPages = Object.entries(pagePoor).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const fmt = (m: string, v: number) =>
    m === "CLS" ? v.toFixed(3)
    : m === "LCP" || m === "INP" || m === "FCP" || m === "TTFB" || m === "FID" ? `${Math.round(v)} ms`
    : v.toFixed(2);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">⚡ Web Vitals（近 7 天）</h1>
        <p className="text-sm text-fg-muted mt-1">
          LCP / INP / CLS / FCP / TTFB / FID 由前台 beacon 上報。total {rows?.length ?? 0} 筆樣本。
        </p>
      </header>

      {stats.length === 0 ? (
        <div className="rounded-xl bg-bg-card border border-border p-12 text-center text-fg-muted">
          🍃 近 7 天還沒有 Web Vitals 資料、等使用者瀏覽幾分鐘就會進來。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((s) => {
            const total = s.total || 1;
            return (
              <div key={s.metric} className="rounded-xl bg-bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{s.metric}</h3>
                  <span className="text-xs text-fg-muted">{s.total.toLocaleString()} 樣本</span>
                </div>
                <div className="text-2xl font-extrabold text-accent">{fmt(s.metric, s.p75)}</div>
                <div className="text-[10px] text-fg-muted">p75（業界用此標）</div>
                <div className="grid grid-cols-3 gap-1 mt-3 text-[10px] text-fg-muted">
                  <div>p50<br /><span className="text-fg font-bold">{fmt(s.metric, s.p50)}</span></div>
                  <div>p75<br /><span className="text-fg font-bold">{fmt(s.metric, s.p75)}</span></div>
                  <div>p95<br /><span className="text-fg font-bold">{fmt(s.metric, s.p95)}</span></div>
                </div>
                <div className="flex gap-1 mt-3 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500" style={{ width: `${(s.good / total) * 100}%` }} title={`good ${s.good}`} />
                  <div className="bg-yellow-500" style={{ width: `${(s.needsImprovement / total) * 100}%` }} title={`needs ${s.needsImprovement}`} />
                  <div className="bg-red-500" style={{ width: `${(s.poor / total) * 100}%` }} title={`poor ${s.poor}`} />
                </div>
                <div className="flex justify-between text-[10px] text-fg-muted mt-1">
                  <span className="text-emerald-400">{Math.round((s.good / total) * 100)}% good</span>
                  <span className="text-yellow-400">{Math.round((s.needsImprovement / total) * 100)}% needs</span>
                  <span className="text-red-400">{Math.round((s.poor / total) * 100)}% poor</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {worstPages.length > 0 && (
        <section className="rounded-xl bg-bg-card border border-border p-4">
          <h2 className="font-bold mb-3">📉 最慢的頁面（poor 次數 Top 10）</h2>
          <ul className="space-y-1 text-sm">
            {worstPages.map(([p, n]) => (
              <li key={p} className="flex justify-between items-center py-1">
                <code className="text-xs text-fg-muted truncate flex-1">{p}</code>
                <span className="text-red-400 font-bold ml-2">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
