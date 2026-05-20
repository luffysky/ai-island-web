import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { GA4Charts } from "./GA4Charts";
import { GA4SyncButton } from "./GA4SyncButton";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">📈 GA4 儀表板</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          GA Property: <code className="bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded text-xs">{gaProperty}</code>
        </p>
      </div>

      {!snapshots || snapshots.length === 0 ? (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="font-bold mb-2">📊 GA4 整合說明</div>
          <p className="text-sm text-[var(--color-fg-muted)] mb-3">
            目前 analytics_snapshots 是空的、有 3 種接 GA 的方式：
          </p>
          <ol className="text-sm space-y-2 list-decimal list-inside text-[var(--color-fg-muted)]">
            <li>
              <strong>嵌入 GA4 Dashboard iframe</strong>（最快）
              <p className="ml-5 text-xs mt-1">Google Analytics → Admin → Reporting → 嵌入式報告</p>
            </li>
            <li>
              <strong>用 GA4 Data API</strong>（推薦）
              <p className="ml-5 text-xs mt-1">每天 cron 跑、把數據存到 analytics_snapshots、這個頁面就活了</p>
            </li>
            <li>
              <strong>用 PostHog / Plausible</strong>（替代）
              <p className="ml-5 text-xs mt-1">完整自架 + 隱私友善</p>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-[var(--color-bg)] rounded text-xs">
            <strong>整合 Step：</strong>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>到 Google Cloud Console 開 Analytics Data API</li>
              <li>建 Service Account、下載 JSON key</li>
              <li>在 GA 加 Service Account 為 viewer</li>
              <li>設 env：GA4_PROPERTY_ID、GA4_SA_CREDENTIALS</li>
              <li>跑 cron：<code className="bg-[var(--color-bg-elevated)] px-1 rounded">/api/admin/ga4/sync</code> 每天更新</li>
            </ol>
          </div>
        </div>
      ) : null}

      {/* 即使沒數據、也顯示框架 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="總瀏覽" value={totalPV.toLocaleString()} color="text-blue-400" />
        <Stat label="不重複訪客" value={totalVisitors.toLocaleString()} color="text-green-400" />
        <Stat label="平均停留" value={`${Math.floor(avgEngagement / 60)}m ${avgEngagement % 60}s`} color="text-purple-400" />
        <Stat label="跳出率" value={`${avgBounce.toFixed(1)}%`} color="text-yellow-400" />
      </div>

      {/* 圖表 */}
      {snapshots && snapshots.length > 0 && <GA4Charts data={snapshots} />}

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TopTable title="🏆 熱門頁面" items={topPages} valueKey="views" labelKey="path" />
        <TopTable title="🔗 引薦來源" items={topReferrers} valueKey="visits" labelKey="source" />
        <TopTable title="🌍 國家" items={topCountries} valueKey="users" labelKey="country" />
      </div>

      {/* GA4 iframe（user 在 GA 後台分享的 dashboard 嵌進來）*/}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-bold mb-3">🔗 GA4 整合</h3>
        <div className="flex flex-wrap gap-2">
          <GA4SyncButton />
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] text-[var(--color-fg)] rounded-lg text-sm font-semibold hover:bg-[var(--color-border)] transition"
          >
            🔗 開啟 Google Analytics
          </a>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] mt-3">
          推薦設 Zeabur Cron Job 每天自動同步：<code className="bg-[var(--color-bg)] px-1 rounded">curl -H "x-cron-secret: $CRON_SECRET" /api/admin/ga4/sync</code>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="text-xs text-[var(--color-fg-muted)]">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function TopTable({ title, items, valueKey, labelKey }: { title: string; items: any[]; valueKey: string; labelKey: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <h4 className="font-bold mb-2 text-sm">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-fg-muted)] py-4 text-center">尚無數據</p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 10).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <span className="truncate flex-1">{item[labelKey] ?? "—"}</span>
              <span className="text-[var(--color-fg-muted)] flex-shrink-0 ml-2">{item[valueKey]?.toLocaleString() ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
