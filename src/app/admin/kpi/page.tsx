import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { PageHero } from "@/components/admin/PageHero";
import { Download, TrendingUp, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * P4-05 KPI 自動報表
 * - 三段（7 / 30 / 90 天）核心指標
 * - DAU / MAU / 新註冊 / 完課 / 付款 / churn
 * - CSV 匯出（client）+ 給 cron 用的 JSON API
 */
export default async function AdminKpiPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(sp.days ?? "30", 10) || 30));
  const admin = createSupabaseAdmin();
  const data = await fetchKpi(admin, days);

  const segments = [7, 30, 90];

  return (
    <div className="space-y-6">
      <PageHero
        emoji="📊"
        title="KPI 報表"
        desc={`當前期間：${days} 天 · 期末對齊今日 (台北日)。三段切換看趨勢、可匯出 CSV 給高層看。`}
        gradient="from-yellow-500/10 via-amber-500/10 to-pink-500/10"
        borderColor="border-yellow-500/30"
      >
        {segments.map((d) => (
          <Link
            key={d}
            href={`?days=${d}` as any}
            className={`text-xs px-3 py-1.5 rounded-full ${days === d ? "bg-accent text-black font-bold" : "border border-border hover:border-accent"}`}
          >
            {d} 天
          </Link>
        ))}
        <a
          href={`/api/admin/kpi.csv?days=${days}`}
          className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" /> CSV
        </a>
      </PageHero>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="新註冊" value={data.signups} unit="人" />
        <Kpi label="DAU（最後 1 天）" value={data.dau} unit="人" />
        <Kpi label="WAU（最後 7 天）" value={data.wau} unit="人" />
        <Kpi label="MAU（最後 30 天）" value={data.mau} unit="人" />
        <Kpi label="完成 lesson 數" value={data.lessonsDone} unit="次" />
        <Kpi label="平均每人完成" value={data.lessonsPerActive.toFixed(1)} unit="lesson" />
        <Kpi label="活躍訂閱中" value={data.activeSubs} unit="人" />
        <Kpi label="期間付款" value={`NT$ ${data.revenueTwd.toLocaleString()}`} unit="" />
      </section>

      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 漏斗（期間註冊用戶）</h2>
        <FunnelBar funnel={data.funnel} />
      </section>

      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> 每日活躍 + 註冊</h2>
        <DailyTable days={data.daily} />
      </section>

      <section className="rounded-xl bg-bg-card border border-border p-3 text-xs text-fg-muted">
        💡 想自動每週發 email？呼叫 <code>/api/admin/kpi.json?days=7</code> 拿 JSON、餵給 cron + Resend / Mailgun 即可。
      </section>
    </div>
  );
}

function Kpi({ label, value, unit }: { label: string; value: any; unit: string }) {
  return (
    <div className="rounded-xl bg-bg-card border border-border p-3">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}<span className="text-[10px] text-fg-muted ml-1">{unit}</span></div>
    </div>
  );
}

function FunnelBar({ funnel }: { funnel: Array<{ label: string; value: number }> }) {
  const max = funnel[0]?.value || 1;
  return (
    <div className="space-y-2 text-sm">
      {funnel.map((f, i) => {
        const pct = (f.value / max) * 100;
        const prev = i > 0 ? funnel[i - 1].value : 0;
        const drop = prev > 0 ? ((prev - f.value) / prev) * 100 : 0;
        return (
          <div key={f.label} className="flex items-center gap-3">
            <span className="w-28">{f.label}</span>
            <div className="flex-1 h-5 rounded-full bg-bg overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent to-accent-2 px-2 text-[10px] text-black font-bold flex items-center" style={{ width: `${pct}%` }}>
                {pct >= 8 ? `${pct.toFixed(0)}%` : ""}
              </div>
            </div>
            <span className="w-16 text-right font-bold">{f.value.toLocaleString()}</span>
            {i > 0 && drop > 0 && <span className="w-14 text-right text-xs text-red-400">−{drop.toFixed(0)}%</span>}
          </div>
        );
      })}
    </div>
  );
}

function DailyTable({ days }: { days: Array<{ date: string; signups: number; active: number; lessons: number }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[400px]">
        <thead className="bg-bg-elevated text-fg-muted">
          <tr>
            <th className="text-left px-3 py-1.5">日期</th>
            <th className="text-right px-3 py-1.5">新註冊</th>
            <th className="text-right px-3 py-1.5">活躍</th>
            <th className="text-right px-3 py-1.5">完成 lesson</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {days.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-6 text-fg-muted">無資料</td></tr>
          ) : days.map((d) => (
            <tr key={d.date}>
              <td className="px-3 py-1.5 font-mono text-[10px]">{d.date}</td>
              <td className="text-right px-3 py-1.5">{d.signups}</td>
              <td className="text-right px-3 py-1.5">{d.active}</td>
              <td className="text-right px-3 py-1.5">{d.lessons}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ 抓 KPI 資料 ============
async function fetchKpi(admin: ReturnType<typeof createSupabaseAdmin>, days: number) {
  const now = Date.now();
  const since = new Date(now - days * 86400_000).toISOString();
  const day1 = new Date(now - 1 * 86400_000).toISOString();
  const day7 = new Date(now - 7 * 86400_000).toISOString();
  const day30 = new Date(now - 30 * 86400_000).toISOString();

  const [{ count: signups }, { count: dau }, { count: wau }, { count: mau }, { count: activeSubs }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", day1).is("banned_at", null),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", day7).is("banned_at", null),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_active_at", day30).is("banned_at", null),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const [{ data: progress }, { data: orders }] = await Promise.all([
    admin.from("lesson_progress").select("user_id, chapter_id, lesson_id, completed_at").gte("completed_at", since).limit(50000),
    admin.from("orders").select("amount_twd:amount, created_at").eq("status", "paid").gte("created_at", since),
  ] as any);

  const lessonsDone = progress?.length ?? 0;
  const activeSet = new Set((progress as any[] ?? []).map((p: any) => p.user_id));
  const lessonsPerActive = activeSet.size > 0 ? lessonsDone / activeSet.size : 0;
  const revenueTwd = ((orders as any[]) ?? []).reduce((s: number, o: any) => s + Number(o.amount_twd ?? 0), 0);

  // 漏斗：期間內註冊用戶分群
  const counts: Record<string, number> = {};
  for (const p of (progress as any[]) ?? []) counts[p.user_id] = (counts[p.user_id] ?? 0) + 1;
  const usersWith1 = Object.values(counts).filter((n) => n >= 1).length;
  const usersWith5 = Object.values(counts).filter((n) => n >= 5).length;
  const usersWith20 = Object.values(counts).filter((n) => n >= 20).length;
  const funnel = [
    { label: "註冊", value: signups ?? 0 },
    { label: "≥ 1 lesson", value: usersWith1 },
    { label: "≥ 5 lesson", value: usersWith5 },
    { label: "≥ 20 lesson", value: usersWith20 },
    { label: "訂閱中", value: activeSubs ?? 0 },
  ];

  // 每日表
  const byDay = new Map<string, { date: string; signups: number; active: number; lessons: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, signups: 0, active: 0, lessons: 0 });
  }
  const [{ data: dailySignups }, { data: dailyActive }] = await Promise.all([
    admin.from("profiles").select("created_at").gte("created_at", since).limit(10000),
    admin.from("profiles").select("last_active_at").gte("last_active_at", since).is("banned_at", null).limit(10000),
  ] as any);

  for (const r of (dailySignups as any[]) ?? []) {
    const k = String(r.created_at).slice(0, 10);
    const v = byDay.get(k);
    if (v) v.signups++;
  }
  for (const r of (dailyActive as any[]) ?? []) {
    const k = String(r.last_active_at).slice(0, 10);
    const v = byDay.get(k);
    if (v) v.active++;
  }
  for (const p of (progress as any[]) ?? []) {
    const k = String(p.completed_at).slice(0, 10);
    const v = byDay.get(k);
    if (v) v.lessons++;
  }

  return {
    signups: signups ?? 0,
    dau: dau ?? 0,
    wau: wau ?? 0,
    mau: mau ?? 0,
    activeSubs: activeSubs ?? 0,
    lessonsDone,
    lessonsPerActive,
    revenueTwd,
    funnel,
    daily: Array.from(byDay.values()),
  };
}
