import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * LT-15 cohort 留存分析。
 *
 * 留存表：按註冊週分組、看每 cohort 在第 N 週後是否還 active（last_active_at 落在該週）
 * funnel：signup → 1 lesson → 5 lesson → boss/quiz → premium
 *
 * 純查詢、無新表。受 last_active_at 準度限制。
 */

const WEEKS = 8; // 觀察 8 週
const MAX_COHORTS = 12; // 顯示最近 12 個 cohort 週

function weekStart(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  const diff = (dow + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - diff);
  return x.toISOString().slice(0, 10);
}
function addWeeks(s: string, n: number): string {
  const d = new Date(s);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

export default async function AdminCohortPage() {
  const admin = createSupabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - (MAX_COHORTS + WEEKS) * 7);
  const sinceIso = since.toISOString();

  const [{ data: users }] = await Promise.all([
    admin.from("profiles").select("id, created_at, last_active_at").gte("created_at", sinceIso).limit(50000),
  ]);

  // 按 cohort 週分組
  type Cohort = { week: string; total: number; byWeekN: number[] };
  const cohorts: Record<string, Cohort> = {};
  for (const u of users ?? []) {
    const cw = weekStart(new Date((u as any).created_at));
    if (!cohorts[cw]) cohorts[cw] = { week: cw, total: 0, byWeekN: Array(WEEKS).fill(0) };
    cohorts[cw].total++;
    const la = (u as any).last_active_at;
    if (!la) continue;
    const lastW = weekStart(new Date(la));
    for (let n = 0; n < WEEKS; n++) {
      const wEnd = addWeeks(cw, n + 1);
      const wStart = addWeeks(cw, n);
      if (lastW >= wStart && lastW < wEnd) {
        cohorts[cw].byWeekN[n]++;
        break;
      }
      if (la >= addWeeks(cw, n) && la < addWeeks(cw, n + 1)) {
        // 用 last_active_at 落在哪一週區間（嚴格依日期）
        cohorts[cw].byWeekN[n]++;
        break;
      }
    }
    // 更準的算法：依「last_active 之後也都算 active」邏輯：N 週內 last_active 如果在 N 週或之後、算 active
    // 上面已用「last_active_at 落在第 N 週」當 active 訊號
  }
  const sortedCohorts = Object.values(cohorts)
    .sort((a, b) => (a.week < b.week ? 1 : -1))
    .slice(0, MAX_COHORTS);

  // funnel
  const [{ count: totalUsers }, { count: hasSub }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sinceIso),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const { data: distinctLessonUsers } = await admin
    .from("lesson_progress")
    .select("user_id")
    .gte("created_at", sinceIso)
    .limit(100000);
  const counts: Record<string, number> = {};
  for (const r of distinctLessonUsers ?? []) {
    counts[(r as any).user_id] = (counts[(r as any).user_id] ?? 0) + 1;
  }
  const usersWith1 = Object.values(counts).filter((n) => n >= 1).length;
  const usersWith5 = Object.values(counts).filter((n) => n >= 5).length;
  const usersWith20 = Object.values(counts).filter((n) => n >= 20).length;

  const funnel = [
    { label: "註冊", value: totalUsers ?? 0 },
    { label: "完成 1 lesson", value: usersWith1 },
    { label: "完成 5 lesson", value: usersWith5 },
    { label: "完成 20 lesson", value: usersWith20 },
    { label: "活躍訂閱中", value: hasSub ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">📈 Cohort 留存 + Funnel（LT-15）</h1>
        <p className="text-sm text-fg-muted mt-1">
          依註冊週分組看 N 週後留存率；轉換漏斗顯示用戶從註冊到付費的流失點。
        </p>
      </header>

      {/* Funnel */}
      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3">🪜 轉換漏斗（近 {(MAX_COHORTS + WEEKS) * 7} 天註冊用戶）</h2>
        <div className="space-y-2">
          {funnel.map((f, i) => {
            const pct = funnel[0].value > 0 ? (f.value / funnel[0].value) * 100 : 0;
            const dropPct = i > 0 && funnel[i - 1].value > 0 ? ((funnel[i - 1].value - f.value) / funnel[i - 1].value) * 100 : 0;
            return (
              <div key={f.label} className="flex items-center gap-3 text-sm">
                <span className="w-32 font-medium">{f.label}</span>
                <div className="flex-1 h-6 rounded-full bg-bg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-2 flex items-center px-2 text-[10px] text-black font-bold"
                    style={{ width: `${pct}%` }}
                  >
                    {pct >= 8 ? `${pct.toFixed(1)}%` : ""}
                  </div>
                </div>
                <span className="w-20 text-right font-bold">{f.value.toLocaleString()}</span>
                <span className="w-20 text-right text-xs text-red-400">
                  {i > 0 && dropPct > 0 ? `−${dropPct.toFixed(0)}%` : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-fg-muted mt-3">
          紅色 = 該階段相對前一階段的流失率。最大流失點 = 應優先改善的地方。
        </p>
      </section>

      {/* Cohort 留存表 */}
      <section className="rounded-xl bg-bg-card border border-border overflow-x-auto">
        <div className="px-4 py-2 border-b border-border text-sm font-bold">👥 留存表（{sortedCohorts.length} cohorts × {WEEKS} 週）</div>
        <table className="w-full text-xs min-w-[700px]">
          <thead className="bg-bg-elevated text-fg-muted">
            <tr>
              <th className="text-left px-3 py-2 sticky left-0 bg-bg-elevated">註冊週</th>
              <th className="text-right px-3 py-2">註冊數</th>
              {Array.from({ length: WEEKS }).map((_, i) => (
                <th key={i} className="text-right px-2 py-2">W{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedCohorts.length === 0 ? (
              <tr><td colSpan={WEEKS + 2} className="text-center py-8 text-fg-muted">尚無資料</td></tr>
            ) : sortedCohorts.map((c) => (
              <tr key={c.week}>
                <td className="px-3 py-2 sticky left-0 bg-bg-card font-mono text-[10px]">{c.week}</td>
                <td className="px-3 py-2 text-right font-bold">{c.total}</td>
                {c.byWeekN.map((n, i) => {
                  const pct = c.total > 0 ? (n / c.total) * 100 : 0;
                  const tone = pct >= 50 ? "bg-emerald-500/30" : pct >= 25 ? "bg-yellow-500/25" : pct > 0 ? "bg-red-500/20" : "bg-bg";
                  return (
                    <td key={i} className={`px-2 py-1.5 text-right ${tone}`} title={`${n} / ${c.total}`}>
                      {pct.toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-[10px] text-fg-muted border-t border-border">
          顏色：綠 ≥50% / 黃 ≥25% / 紅 &lt;25% / 無色 0%。準度受 last_active_at 更新頻率限制。
        </div>
      </section>
    </div>
  );
}
