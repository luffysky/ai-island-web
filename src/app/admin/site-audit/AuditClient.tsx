"use client";

import { useState, useMemo, useTransition } from "react";
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Filter, ExternalLink, Lock, Globe, Users, Wrench } from "lucide-react";
import type { RouteEntry } from "./page";

type PingResult = {
  status?: number;
  ok: boolean;          // 真的通了 (200 / 401 / 403)
  partial?: boolean;    // endpoint 存在但 GET 無法完全驗證 (405 POST-only / 400 缺參數)
  redirect?: boolean;
  redirectTo?: string;
  error?: string;
  ms?: number;
};

const AREA_META: Record<RouteEntry["area"], { label: string; emoji: string; tone: string; icon: any }> = {
  public:     { label: "前台公開",   emoji: "🌐", tone: "text-green-400",   icon: Globe },
  auth:       { label: "前台會員",   emoji: "👤", tone: "text-blue-400",    icon: Users },
  admin:      { label: "後台",       emoji: "🔐", tone: "text-yellow-400",  icon: Lock },
  api_public: { label: "API 公開",   emoji: "🔓", tone: "text-green-300",   icon: Wrench },
  api_auth:   { label: "API 會員",   emoji: "🔒", tone: "text-blue-300",    icon: Wrench },
  api_admin:  { label: "API 後台",   emoji: "🛡️", tone: "text-yellow-300",  icon: Wrench },
};

export function AuditClient({ routes }: { routes: RouteEntry[] }) {
  const [results, setResults] = useState<Map<string, PingResult>>(new Map());
  const [pingingAll, setPingingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "broken" | "partial" | "redirect" | "untested" | RouteEntry["area"]>("all");
  const [search, setSearch] = useState("");
  const [skipDynamic, setSkipDynamic] = useState(true);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return routes.filter((r) => {
      if (search && !r.path.toLowerCase().includes(search.toLowerCase())) return false;
      const res = results.get(r.path);
      if (filter === "broken") return res && !res.ok && !res.partial && !res.redirect;
      if (filter === "partial") return res && res.partial;
      if (filter === "redirect") return res && res.redirect;
      if (filter === "untested") return !res;
      if (filter !== "all" && r.area !== filter) return false;
      return true;
    });
  }, [routes, results, filter, search]);

  // 動態路徑代入 sample 值（粗糙、但能驗 endpoint 是否會 500）
  const fillDynamic = (path: string): string => {
    return path
      .replace(/\[\.{3}[^\]]+\]/g, "sample")  // [...slug]
      .replace(/\[id\]/gi, "00000000-0000-0000-0000-000000000000")
      .replace(/\[[^\]]*[Ss]lug[^\]]*\]/g, "sample-slug")
      .replace(/\[[^\]]*[Uu]ser[^\]]*\]/g, "sample")
      .replace(/\[[^\]]*[Kk]ey[^\]]*\]/g, "sample_key")
      .replace(/\[[^\]]+\]/g, "1");
  };

  const pingOne = async (path: string, type: "page" | "api", _isDynamic = false): Promise<PingResult> => {
    const realPath = /\[[^\]]+\]/.test(path) ? fillDynamic(path) : path;
    const start = Date.now();
    try {
      const res = await fetch(realPath, {
        method: "GET",
        redirect: "manual",
        credentials: "same-origin",
      });
      const ms = Date.now() - start;
      const status = res.status;
      if (status >= 300 && status < 400) {
        return { status, ok: false, redirect: true, redirectTo: res.headers.get("location") ?? undefined, ms };
      }
      // ✅ 真的通：只給 200/2xx
      const ok = res.ok;
      // 🟡 需手動驗：401/403 (要登入)、405 (POST-only)、400/422 (缺參數或 body)
      const partial = !ok && [400, 401, 403, 405, 422].includes(status);
      return { status, ok, partial, ms };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "fetch_failed", ms: Date.now() - start };
    }
  };

  const setResult = (path: string, r: PingResult) => {
    startTransition(() => {
      setResults((prev) => {
        const next = new Map(prev);
        next.set(path, r);
        return next;
      });
    });
  };

  const pingAll = async () => {
    setPingingAll(true);
    setResults(new Map());
    const toPing = routes.filter((r) => !skipDynamic || !r.is_dynamic);
    // 分批 5 個並行、避免 server 過載
    for (let i = 0; i < toPing.length; i += 5) {
      const batch = toPing.slice(i, i + 5);
      await Promise.all(
        batch.map(async (r) => {
          const result = await pingOne(r.fetchPath, r.type);
          setResult(r.path, result);
        }),
      );
    }
    setPingingAll(false);
  };

  const pingSingle = async (route: RouteEntry) => {
    setResult(route.path, { ok: false, error: "...", ms: 0 });
    const r = await pingOne(route.fetchPath, route.type);
    setResult(route.path, r);
  };

  const grouped = useMemo(() => {
    const g: Record<string, RouteEntry[]> = {};
    for (const r of filtered) {
      (g[r.area] ||= []).push(r);
    }
    return g;
  }, [filtered]);

  const summary = useMemo(() => {
    let ok = 0, partial = 0, broken = 0, redirect = 0, untested = 0, dynamic = 0;
    for (const r of routes) {
      if (r.is_dynamic) { dynamic++; continue; }
      const res = results.get(r.path);
      if (!res) untested++;
      else if (res.ok) ok++;
      else if (res.partial) partial++;
      else if (res.redirect) redirect++;
      else broken++;
    }
    return { ok, partial, broken, redirect, untested, dynamic };
  }, [routes, results]);

  return (
    <div className="space-y-4">
      {/* 控制 bar */}
      <div className="bg-bg-card border border-border rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={pingAll}
            disabled={pingingAll}
            className="px-4 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1 disabled:opacity-50"
          >
            {pingingAll ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {pingingAll ? "測試中..." : "🚀 全部測一遍"}
          </button>
          <label className="text-xs inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={skipDynamic}
              onChange={(e) => setSkipDynamic(e.target.checked)}
              className="accent-accent"
            />
            跳過動態路徑（含 [id]）
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Filter size={12} className="text-fg-muted" />
          <FilterChip current={filter} value="all" onClick={setFilter}>全部</FilterChip>
          <FilterChip current={filter} value="broken" onClick={setFilter} tone="danger">❌ 壞掉 ({summary.broken})</FilterChip>
          <FilterChip current={filter} value="partial" onClick={setFilter} tone="warning">🟡 需手動驗 ({summary.partial})</FilterChip>
          <FilterChip current={filter} value="redirect" onClick={setFilter} tone="warning">↪️ 轉址 ({summary.redirect})</FilterChip>
          <FilterChip current={filter} value="untested" onClick={setFilter}>未測 ({summary.untested})</FilterChip>
          <span className="text-fg-muted">|</span>
          {Object.entries(AREA_META).map(([k, m]) => (
            <FilterChip key={k} current={filter} value={k as any} onClick={setFilter}>
              {m.emoji} {m.label}
            </FilterChip>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 搜路徑（/admin/line 之類）"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* summary banner */}
      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          <SummaryCard label="✅ 通了" value={summary.ok} color="text-green-400" />
          <SummaryCard label="🟡 需手動驗" value={summary.partial} color="text-yellow-400" />
          <SummaryCard label="❌ 壞掉" value={summary.broken} color="text-red-400" />
          <SummaryCard label="↪️ 轉址" value={summary.redirect} color="text-orange-400" />
          <SummaryCard label="未測" value={summary.untested} color="text-fg-muted" />
          <SummaryCard label="動態跳過" value={summary.dynamic} color="text-fg-muted" />
        </div>
      )}

      {/* 分組列表 */}
      {Object.entries(grouped).map(([area, list]) => {
        const meta = AREA_META[area as RouteEntry["area"]];
        return (
          <section key={area}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
              <meta.icon size={14} className={meta.tone} />
              <span>{meta.emoji} {meta.label}</span>
              <span className="text-xs text-fg-muted font-normal">（{list.length}）</span>
            </h2>
            <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated text-left text-xs text-fg-muted">
                  <tr>
                    <th className="px-3 py-2">路徑</th>
                    <th className="px-3 py-2 w-16">類型</th>
                    <th className="px-3 py-2 w-24">狀態</th>
                    <th className="px-3 py-2 w-32 text-right">動作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <RouteRow
                      key={r.path + r.file}
                      route={r}
                      result={results.get(r.path)}
                      onPing={() => pingSingle(r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-fg-muted text-sm bg-bg-card rounded-xl border border-border">
          沒有符合條件的路徑
        </div>
      )}
    </div>
  );
}

function FilterChip({
  current,
  value,
  onClick,
  children,
  tone,
}: {
  current: string;
  value: string;
  onClick: (v: any) => void;
  children: React.ReactNode;
  tone?: "danger" | "warning";
}) {
  const active = current === value;
  const base = active ? "bg-accent text-black" : "bg-bg-elevated border border-border";
  return (
    <button onClick={() => onClick(value)} className={`px-2 py-1 rounded-full ${base}`}>
      {children}
    </button>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-elevated rounded-lg p-2">
      <div className="text-[10px] text-fg-muted">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function RouteRow({ route, result, onPing }: { route: RouteEntry; result?: PingResult; onPing: () => void }) {
  const isDynamic = route.is_dynamic;
  return (
    <tr className="border-t border-border hover:bg-bg-elevated/50">
      <td className="px-3 py-2 font-mono text-xs">
        <code className={isDynamic ? "text-fg-muted" : "text-fg"}>{route.path}</code>
        {isDynamic && <span className="ml-1.5 text-[9px] text-yellow-400" title="會用假 id 代入測">[id→1]</span>}
      </td>
      <td className="px-3 py-2 text-xs text-fg-muted">{route.type === "page" ? "📄 page" : "🔌 api"}</td>
      <td className="px-3 py-2 text-xs">
        {!result ? (
          <span className="text-fg-muted">—</span>
        ) : result.error === "..." ? (
          <Loader2 size={11} className="animate-spin text-accent inline" />
        ) : result.error === "dynamic_skipped" ? (
          <span className="text-fg-muted text-[10px]">跳過</span>
        ) : result.ok ? (
          <span className="inline-flex items-center gap-1 text-green-400">
            <CheckCircle2 size={11} /> {result.status}
            {(result.status === 401 || result.status === 403) && <span className="text-[10px] text-fg-muted">(guard ok)</span>}
            {result.ms && <span className="text-[10px] text-fg-muted">{result.ms}ms</span>}
          </span>
        ) : result.partial ? (
          <span className="inline-flex items-center gap-1 text-yellow-400">
            <AlertCircle size={11} /> {result.status}
            {result.status === 401 && <span className="text-[10px] text-fg-muted">需登入</span>}
            {result.status === 403 && <span className="text-[10px] text-fg-muted">需 admin / 權限</span>}
            {result.status === 405 && <span className="text-[10px] text-fg-muted">POST-only</span>}
            {result.status === 400 && <span className="text-[10px] text-fg-muted">缺參數</span>}
            {result.status === 422 && <span className="text-[10px] text-fg-muted">需 body</span>}
            {result.ms && <span className="text-[10px] text-fg-muted">{result.ms}ms</span>}
          </span>
        ) : result.redirect ? (
          <span className="inline-flex items-center gap-1 text-yellow-400">
            <AlertCircle size={11} /> {result.status}
            {result.redirectTo && <span className="text-[10px] text-fg-muted">→ {result.redirectTo.slice(0, 30)}</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-400" title={result.error}>
            <XCircle size={11} /> {result.status ?? "ERR"}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1">
          {!isDynamic && (
            <button
              onClick={onPing}
              className="text-[10px] px-2 py-1 rounded border border-border hover:border-accent hover:text-accent"
              title="ping 一次"
            >
              ping
            </button>
          )}
          <a
            href={route.fetchPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 rounded border border-border hover:border-accent hover:text-accent inline-flex items-center gap-0.5"
            title="新分頁打開"
          >
            <ExternalLink size={9} />
          </a>
        </div>
      </td>
    </tr>
  );
}
