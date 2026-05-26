"use client";
import { useState, useMemo } from "react";

type SessionRow = {
  id: string;
  visitor_id: string;
  user_id: string | null;
  started_at: string;
  last_seen_at: string;
  current_path: string | null;
  current_title: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  page_count: number;
  total_duration_sec: number;
  max_scroll_pct: number;
  profile?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    level?: number | null;
    role?: string | null;
    last_active_at?: string | null;
  } | null;
};

type PageViewRow = {
  id: string;
  visitor_id?: string;
  user_id: string | null;
  path: string;
  title: string | null;
  started_at: string;
  duration_sec: number;
  scroll_max_pct: number;
  read_complete: boolean;
  device_type: string | null;
  country: string | null;
  city: string | null;
  profile?: SessionRow["profile"];
};

function seconds(value: number) {
  const min = Math.floor((value || 0) / 60);
  const sec = (value || 0) % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function displayUser(row: { profile?: SessionRow["profile"]; visitor_id?: string; user_id?: string | null }) {
  if (row.profile) return row.profile.display_name || row.profile.username || row.user_id || "會員";
  return `訪客 ${row.visitor_id?.slice(-6) ?? "unknown"}`;
}

export function InteractionPanels({
  activeSessions,
  recentPageViews,
}: {
  activeSessions: SessionRow[];
  recentPageViews: PageViewRow[];
}) {
  const now = Date.now();
  const totalDuration = recentPageViews.reduce((sum, row) => sum + (row.duration_sec ?? 0), 0);
  const completed = recentPageViews.filter((row) => row.read_complete).length;
  const activeMembers = activeSessions.filter((row) => row.user_id).length;

  const pageStats = Object.values(recentPageViews.reduce<Record<string, { path: string; views: number; duration: number; complete: number }>>((acc, row) => {
    acc[row.path] ??= { path: row.path, views: 0, duration: 0, complete: 0 };
    acc[row.path].views++;
    acc[row.path].duration += row.duration_sec ?? 0;
    if (row.read_complete) acc[row.path].complete++;
    return acc;
  }, {})).sort((a, b) => b.views - a.views).slice(0, 12);

  const deviceStats = Object.values(recentPageViews.reduce<Record<string, { label: string; count: number }>>((acc, row) => {
    const label = row.device_type || "unknown";
    acc[label] ??= { label, count: 0 };
    acc[label].count++;
    return acc;
  }, {})).sort((a, b) => b.count - a.count);

  const regionStats = Object.values(recentPageViews.reduce<Record<string, { label: string; count: number }>>((acc, row) => {
    const label = [row.country, row.city].filter(Boolean).join(" / ") || "unknown";
    acc[label] ??= { label, count: 0 };
    acc[label].count++;
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">即時互動</h3>
        <p className="text-xs text-fg-muted mt-1">站內第一方追蹤，約 15 秒 heartbeat；5 分鐘內有心跳視為在線。</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="在線總數" value={activeSessions.length} />
        <MiniStat label="在線會員" value={activeMembers} />
        <MiniStat label="近 24h 瀏覽" value={recentPageViews.length} />
        <MiniStat label="看完率" value={recentPageViews.length ? `${Math.round((completed / recentPageViews.length) * 100)}%` : "0%"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="現在誰在用">
          {activeSessions.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="text-fg-muted">
                  <tr>
                    <th className="text-left py-2">使用者</th>
                    <th className="text-left py-2">目前頁面</th>
                    <th className="text-left py-2">裝置</th>
                    <th className="text-left py-2">區域</th>
                    <th className="text-right py-2">最後心跳</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="py-2">
                        <div className="font-medium">{displayUser(row)}</div>
                        <div className="text-[10px] text-fg-muted">{row.user_id ? row.profile?.role ?? "member" : "guest"}</div>
                      </td>
                      <td className="py-2 max-w-xs">
                        <div className="truncate">{row.current_title || row.current_path || "—"}</div>
                        <div className="truncate text-[10px] text-fg-muted">{row.current_path}</div>
                      </td>
                      <td className="py-2">{row.device_type} · {row.browser} · {row.os}</td>
                      <td className="py-2">{[row.country, row.city].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="py-2 text-right">{Math.max(0, Math.round((now - new Date(row.last_seen_at).getTime()) / 1000))}s 前</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <RecentPageViewsPanel recentPageViews={recentPageViews} />
      </div>

      <div>
        <h3 className="text-lg font-bold">歷史互動</h3>
        <p className="text-xs text-fg-muted mt-1">近 24 小時頁面、裝置、區域、停留時間與看完狀態。</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="頁面表現">
          {pageStats.length === 0 ? <Empty /> : pageStats.map((row) => (
            <MetricLine key={row.path} label={row.path} value={`${row.views} 次 · 平均 ${seconds(Math.round(row.duration / row.views))} · 看完 ${Math.round((row.complete / row.views) * 100)}%`} />
          ))}
        </Panel>
        <Panel title="裝置">
          {deviceStats.length === 0 ? <Empty /> : deviceStats.map((row) => <MetricLine key={row.label} label={row.label} value={`${row.count} 次`} />)}
        </Panel>
        <Panel title="區域">
          {regionStats.length === 0 ? <Empty /> : regionStats.map((row) => <MetricLine key={row.label} label={row.label} value={`${row.count} 次`} />)}
        </Panel>
      </div>

      <Panel title="整體摘要">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <MiniStat label="總停留" value={seconds(totalDuration)} />
          <MiniStat label="平均停留" value={recentPageViews.length ? seconds(Math.round(totalDuration / recentPageViews.length)) : "0s"} />
          <MiniStat label="完成閱讀" value={completed} />
          <MiniStat label="未完成離開" value={Math.max(0, recentPageViews.length - completed)} />
        </div>
      </Panel>
    </div>
  );
}

function RecentPageViewsPanel({ recentPageViews }: { recentPageViews: PageViewRow[] }) {
  const [showAll, setShowAll] = useState(false);

  // 預設去重：每個 user_id（或訪客 visitor_id）只顯示最新 1 筆
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const result: PageViewRow[] = [];
    for (const row of recentPageViews) {
      const key = row.user_id || `guest:${row.visitor_id || row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(row);
      if (result.length >= 20) break;
    }
    return result;
  }, [recentPageViews]);

  const displayList = showAll ? recentPageViews.slice(0, 50) : deduped;

  return (
    <section className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h4 className="font-bold text-sm">
          最新頁面停留
          <span className="text-[10px] font-normal text-fg-muted ml-2">
            {showAll ? `全部 ${displayList.length}/${recentPageViews.length} 筆` : `去重 ${deduped.length} 位使用者`}
          </span>
        </h4>
        <button
          onClick={() => setShowAll((s) => !s)}
          className="text-[10px] px-2 py-1 rounded border border-border bg-bg-elevated hover:border-accent transition"
        >
          {showAll ? "去重模式" : "看全部"}
        </button>
      </div>
      {displayList.length === 0 ? <Empty /> : (
        <div className="space-y-2">
          {displayList.map((row) => (
            <div key={row.id} className="rounded border border-border bg-bg p-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.title || row.path}</div>
                  <div className="truncate text-fg-muted">{displayUser(row)} · {row.path}</div>
                </div>
                <div className="text-right text-fg-muted shrink-0">
                  <div>{seconds(row.duration_sec)}</div>
                  <div>{row.scroll_max_pct}% {row.read_complete ? "看完" : ""}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card border border-border rounded-xl p-4">
      <h4 className="font-bold text-sm mb-3">{title}</h4>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg border border-border rounded-lg p-3">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2 text-xs first:border-t-0">
      <span className="truncate">{label}</span>
      <span className="text-fg-muted shrink-0">{value}</span>
    </div>
  );
}

function Empty() {
  return <div className="py-8 text-center text-xs text-fg-muted">尚無資料</div>;
}
