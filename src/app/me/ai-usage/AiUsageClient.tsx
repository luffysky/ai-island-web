"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Series = { date: string; tokens: number; cost: number; calls: number };
type Data = {
  quota: { cap: number | null; used: number; remaining: number | null; unlimited: boolean; isPremium: boolean };
  totals: { totalTokens: number; totalCostUsd: number; totalCalls: number; days: number };
  series: Series[];
};

export default function AiUsageClient() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [metric, setMetric] = useState<"tokens" | "calls" | "cost">("tokens");

  useEffect(() => {
    let alive = true;
    fetch("/api/me/ai-usage")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) { setErr(true); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5 animate-pulse h-80" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-sm text-fg-muted">
          讀取用量時發生問題，請稍後再試。
        </div>
      </div>
    );
  }

  const { quota, totals, series } = data;
  const hasUsage = totals.totalTokens > 0 || totals.totalCalls > 0;

  return (
    <div className="space-y-6">
      <Header />

      {/* Badge */}
      {(quota.unlimited || quota.isPremium) && (
        <div className="flex flex-wrap gap-2">
          {quota.unlimited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 px-3 py-1 text-xs font-semibold">
              ✨ 無限用量（特權帳號）
            </span>
          )}
          {quota.isPremium && !quota.unlimited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-3 py-1 text-xs font-semibold">
              👑 Premium 訂閱中
            </span>
          )}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="本月已用 tokens" value={quota.used.toLocaleString()} color="text-blue-400" />
        <Stat
          label="本月額度 (cap)"
          value={quota.unlimited || quota.cap == null ? "無限" : quota.cap.toLocaleString()}
          color="text-fg"
        />
        <Stat
          label="本月剩餘"
          value={quota.unlimited || quota.remaining == null ? "無限" : quota.remaining.toLocaleString()}
          color="text-green-400"
        />
        <Stat label="近 30 天總呼叫" value={totals.totalCalls.toLocaleString()} color="text-purple-400" />
        <Stat
          label="近 30 天估計成本"
          value={`$${totals.totalCostUsd.toFixed(4)}`}
          color="text-yellow-400"
          hint="估計"
        />
        <Stat label="近 30 天總 tokens" value={totals.totalTokens.toLocaleString()} color="text-cyan-400" />
      </div>

      {/* Chart or empty state */}
      {hasUsage ? (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold">📈 近 30 天用量趨勢</h3>
            <div className="flex gap-1 text-xs">
              <Tab active={metric === "tokens"} onClick={() => setMetric("tokens")}>Tokens</Tab>
              <Tab active={metric === "calls"} onClick={() => setMetric("calls")}>呼叫數</Tab>
              <Tab active={metric === "cost"} onClick={() => setMetric("cost")}>成本</Tab>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
              <XAxis dataKey="date" stroke="#999" fontSize={11} tickFormatter={(d: string) => d?.slice(5)} />
              <YAxis stroke="#999" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "#1e1e2e", border: "1px solid #444", borderRadius: 8, fontSize: 12, color: "#fff" }}
                formatter={(v: any) => (metric === "cost" ? `$${Number(v).toFixed(4)}` : Number(v).toLocaleString())}
              />
              <Bar dataKey={metric} fill="#50fa7b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <div className="text-3xl mb-2">🌱</div>
          <div className="font-bold text-black/80 dark:text-white/85">你還沒有 AI 用量紀錄</div>
          <p className="text-sm text-fg-muted mt-1">
            開始跟 AI 助教聊聊、或邊上課邊問問題，這裡就會出現你的用量趨勢。
          </p>
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            <Link href="/me/assistant" className="rounded-lg bg-accent text-black font-semibold px-4 py-2 text-sm hover:opacity-90 transition">
              🤝 找 AI 助教
            </Link>
            <Link href="/chapters" className="rounded-lg border border-border px-4 py-2 text-sm hover:text-accent hover:border-accent/50 transition">
              📚 去上課
            </Link>
          </div>
        </div>
      )}

      {/* Honest note */}
      <p className="text-[11px] text-fg-muted leading-relaxed">
        ⚠️ 成本是<b>估計值</b>（依各模型定價換算）、僅供你了解自己的用量；<b>不是帳單</b>。用量以本月 token 額度為準。
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 text-black/80 dark:text-white/85">📊 AI 使用量 / 成本</h1>
      <p className="text-sm text-fg-muted mt-1">看你自己近 30 天用了多少 AI、本月額度還剩多少。</p>
    </div>
  );
}

function Stat({ label, value, color, hint }: { label: string; value: any; color: string; hint?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted flex items-center gap-1">
        {label}
        {hint && <span className="rounded bg-yellow-500/15 text-yellow-500 px-1 text-[10px]">{hint}</span>}
      </div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded transition ${active ? "bg-accent text-black font-semibold" : "bg-bg-elevated hover:bg-border"}`}
    >
      {children}
    </button>
  );
}
