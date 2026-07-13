"use client";

import { useEffect, useState } from "react";
import { BatteryCharging, Coins, Bot, Gauge, Sparkles, Zap, Leaf } from "lucide-react";

type Energy = {
  quota: { unlimited: boolean; premium: boolean; cap: number; used: number; remaining: number | null };
  agent: { total: number; todayCount: number; monthCount: number; successRate: number | null; topSkill: { name: string; count: number } | null };
  zCoin: number;
};

export function EnergyCenter() {
  const [data, setData] = useState<Energy | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/energy")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) { setErr(true); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="surface-glass rounded-2xl p-6 animate-pulse h-40" />;
  if (err || !data) return <div className="surface-glass rounded-2xl p-6 text-sm text-fg-muted">能源資料載入失敗，稍後再試。</div>;

  const q = data.quota;
  const pct = q.unlimited ? 100 : q.cap > 0 ? Math.round(((q.remaining ?? 0) / q.cap) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><BatteryCharging className="text-accent" size={26} /> AI 能源中心</h1>
        <p className="text-sm text-fg-muted mt-1">你的每日免費額度、Z 幣、分身島活動一覽。系統自動免費優先、額度用完才動 Z 幣。</p>
      </div>

      {/* 今日免費額度 */}
      <section className="surface-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium inline-flex items-center gap-1.5"><Zap size={16} className="text-accent" /> 今日免費 AI 額度</span>
          <span className="text-sm font-mono">
            {q.unlimited ? <span className="text-accent font-bold">∞ 無限{q.premium ? "（訂閱）" : ""}</span> : <><span className="text-fg font-bold">{q.remaining}</span><span className="text-fg-muted"> / {q.cap}</span></>}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-bg-elevated overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {!q.unlimited && (
          <p className="text-xs text-fg-muted mt-2">今天已用 {q.used} 次。每日 0 點重置；用完可用 Z 幣續用。</p>
        )}
      </section>

      {/* 數據列 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<Coins size={18} className="text-gold" />} label="Z 幣餘額" value={data.zCoin.toLocaleString()} />
        <Stat icon={<Bot size={18} className="text-accent-3" />} label="今日分身任務" value={String(data.agent.todayCount)} />
        <Stat icon={<Sparkles size={18} className="text-accent-2" />} label="本月任務" value={String(data.agent.monthCount)} />
        <Stat icon={<Gauge size={18} className="text-accent" />} label="任務成功率" value={data.agent.successRate == null ? "—" : `${data.agent.successRate}%`} />
      </div>

      {/* 最常用技能 */}
      {data.agent.topSkill && (
        <section className="surface-glass rounded-2xl p-5 flex items-center gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-accent-3/10 text-accent-3 shrink-0"><Bot size={20} /></div>
          <div className="min-w-0">
            <div className="text-xs text-fg-muted">最常出動的員工 / 技能</div>
            <div className="font-semibold truncate">{data.agent.topSkill.name} <span className="text-fg-muted font-normal text-sm">· 用過 {data.agent.topSkill.count} 次</span></div>
          </div>
        </section>
      )}

      <p className="text-xs text-fg-muted inline-flex items-center gap-1.5"><Leaf size={13} className="text-accent" /> 省能原則：優先用免費模型、查夠就收尾、讀過的內容不重讀。</p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-glass rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-1">{icon}{label}</div>
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
