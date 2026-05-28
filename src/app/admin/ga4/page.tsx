import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { GA4Charts } from "./GA4Charts";
import { GA4SyncButton } from "./GA4SyncButton";
import { InteractionPanels } from "./InteractionPanels";
import { PageHero } from "@/components/admin/PageHero";

export default async function GA4Page() {
  const supabase = createSupabaseAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const { data: snapshots } = await supabase
    .from("analytics_snapshots")
    .select("*")
    .gte("date", thirtyDaysAgo)
    .order("date", { ascending: true });

  const totalPV = snapshots?.reduce((s: number, d: any) => s + (d.page_views ?? 0), 0) ?? 0;
  const totalVisitors = snapshots?.reduce((s: number, d: any) => s + (d.unique_visitors ?? 0), 0) ?? 0;
  const avgEngagement = snapshots && snapshots.length > 0
    ? Math.round(snapshots.reduce((s: number, d: any) => s + (d.avg_engagement_sec ?? 0), 0) / snapshots.length)
    : 0;
  const avgBounce = snapshots && snapshots.length > 0
    ? snapshots.reduce((s: number, d: any) => s + Number(d.bounce_rate ?? 0), 0) / snapshots.length
    : 0;

  // 最近 1 天的 top pages
  const latest: any = snapshots?.[snapshots.length - 1];
  const topPages: any[] = latest?.top_pages ?? [];
  const topReferrers: any[] = latest?.top_referrers ?? [];
  const topCountries: any[] = latest?.top_countries ?? [];

  const gaProperty = process.env.NEXT_PUBLIC_GA_ID || "未設定";
  const activeSince = new Date(Date.now() - 5 * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: activeSessions } = await supabase
    .from("analytics_sessions")
    .select("*, district, profile:profiles(username, display_name, avatar_url, level, role, last_active_at)")
    .gte("last_seen_at", activeSince)
    .order("last_seen_at", { ascending: false })
    .limit(100);
  const { data: recentPageViews } = await supabase
    .from("analytics_page_views")
    .select("*, district, profile:profiles(username, display_name, avatar_url, level, role, last_active_at)")
    .gte("started_at", dayAgo)
    .order("started_at", { ascending: false })
    .limit(300);

  const hasGa4 = snapshots && snapshots.length > 0;

  // Geo 覆蓋率（7 天）：訪客的 country/city/district 命中比例
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [geoTotal, geoCountry, geoCity, geoDistrict] = await Promise.all([
    supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", sevenDaysAgo),
    supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", sevenDaysAgo).not("country", "is", null),
    supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", sevenDaysAgo).not("city", "is", null),
    supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", sevenDaysAgo).not("district", "is", null),
  ]);
  const totalSessions = geoTotal.count ?? 0;
  const pct = (n: number | null) => (totalSessions > 0 ? Math.round((n ?? 0) / totalSessions * 100) : 0);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="📊"
        title="站台分析"
        desc="站內第一方追蹤 (即時 + 24h 歷史) 為主數據源、GA4 可選同步當二次驗證。"
        gradient="from-green-500/10 via-emerald-500/10 to-teal-500/10"
        borderColor="border-green-500/30"
      />

      {/* Geo 覆蓋率（7 天）— IP 自動 vs GPS opt-in 兩條路 */}
      <section className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
          <h3 className="font-bold text-sm">📍 地理資料覆蓋率（過去 7 天）</h3>
          <span className="text-xs text-fg-muted">{totalSessions.toLocaleString()} session</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CoverageBar label="國家" subtitle="IP 自動" pct={pct(geoCountry.count)} count={geoCountry.count ?? 0} />
          <CoverageBar label="縣市" subtitle="IP 自動（ipwho.is + ip-api fallback）" pct={pct(geoCity.count)} count={geoCity.count ?? 0} />
          <CoverageBar label="區" subtitle="訪客 GPS opt-in" pct={pct(geoDistrict.count)} count={geoDistrict.count ?? 0} />
        </div>
        <p className="text-[11px] text-fg-muted mt-3 leading-snug">
          縣市靠 IP 自動取得（訪客無感）。
          「區」級必須訪客在 cookie banner 勾選或到 /settings 啟用 GPS — IP 物理上拿不到行政區。
        </p>
      </section>
      <div className="hidden">
        <p className="text-sm text-fg-muted mt-1">
          站內第一方追蹤（即時 + 24h 歷史）為主數據源。
          {hasGa4 && (
            <>
              {" "}
              · GA4 補充：<code className="bg-bg-elevated px-1.5 py-0.5 rounded text-xs">{gaProperty}</code>
            </>
          )}
        </p>
      </div>

      {/* 站內互動分析（即時 + 24h 歷史）— 主要區塊 */}
      <InteractionPanels
        activeSessions={activeSessions ?? []}
        recentPageViews={recentPageViews ?? []}
      />

      {/* GA4 區塊：有資料才秀 */}
      {hasGa4 && (
        <>
          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-bold mb-1">GA4 補充 30 天</h3>
            <p className="text-xs text-fg-muted mb-4">
              來自 Google Analytics、與站內分析互為佐證。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="總瀏覽" value={totalPV.toLocaleString()} color="text-blue-400" />
              <Stat label="不重複訪客" value={totalVisitors.toLocaleString()} color="text-green-400" />
              <Stat label="平均停留" value={`${Math.floor(avgEngagement / 60)}m ${avgEngagement % 60}s`} color="text-purple-400" />
              <Stat label="跳出率" value={`${avgBounce.toFixed(1)}%`} color="text-yellow-400" />
            </div>
          </div>
          <GA4Charts data={snapshots} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TopTable title="🏆 熱門頁面" items={topPages} valueKey="views" labelKey="path" />
            <TopTable title="🔗 引薦來源" items={topReferrers} valueKey="visits" labelKey="source" />
            <TopTable title="🌍 國家" items={topCountries} valueKey="users" labelKey="country" />
          </div>
        </>
      )}

      {/* GA4 設定 / 同步：collapse 在最下方、不影響主畫面 */}
      <details className="bg-bg-card border border-border rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          ⚙️ GA4 設定（選用）
        </summary>
        <div className="px-4 pb-4 text-sm space-y-3">
          <p className="text-xs text-fg-muted">
            站內第一方分析已涵蓋主要指標。GA4 是補充、非必要。
            若仍想接、需在 Zeabur 設 <code>GA4_PROPERTY_ID</code>、<code>GA4_SA_CREDENTIALS</code>、<code>CRON_SECRET</code>。
            注意：Google 對 service account email 採嚴格驗證、加入 GA4 可能被擋。
          </p>
          <div className="flex flex-wrap gap-2">
            <GA4SyncButton />
            <a
              href="https://analytics.google.com/analytics/web/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-elevated text-fg rounded-lg text-sm font-semibold hover:bg-border transition"
            >
              🔗 開啟 Google Analytics
            </a>
          </div>
        </div>
      </details>
    </div>
  );
}

function CoverageBar({ label, subtitle, pct, count }: { label: string; subtitle: string; pct: number; count: number }) {
  const tone =
    pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-lg font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden mb-1.5">
        <div className={`h-full ${tone} transition-[width]`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-fg-muted leading-tight">{subtitle}</div>
      <div className="text-[10px] text-fg-muted mt-0.5">{count.toLocaleString()} 筆</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function TopTable({ title, items, valueKey, labelKey }: { title: string; items: any[]; valueKey: string; labelKey: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h4 className="font-bold mb-2 text-sm">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-fg-muted py-4 text-center">尚無數據</p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 10).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <span className="truncate flex-1">{item[labelKey] ?? "—"}</span>
              <span className="text-fg-muted shrink-0 ml-2">{item[valueKey]?.toLocaleString() ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
