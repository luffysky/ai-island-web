"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, BarChart3, Banknote, Flame } from "lucide-react";

export function AiCostClient() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => { load(days); }, [days]);

  async function load(d: number) {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/ai-cost?days=${d}`, { credentials: "include" });
      const j = await r.json();
      setData(j);
    } finally { setLoading(false); }
  }

  if (loading) return <div className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto" /></div>;
  if (!data?.ok) return <p className="text-red-500">{data?.error ?? "fail"}</p>;

  const s = data.summary;
  const seg = data.by_segment;
  const top = data.top_spenders ?? [];
  const be = data.breakeven;

  return (
    <div className="space-y-4">
      {/* 期間切換 */}
      <div className="flex items-center gap-2">
        <span className="text-sm">期間：</span>
        {[7, 30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`btn-chip text-xs ${days === d ? "btn-chip-success" : "btn-chip-neutral"}`}>
            {d} 天
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="活躍 user" value={s.total_users} color="text-accent" />
        <Stat label={`總成本 ${data.period_days}d`} value={`$${s.total_cost_usd}`} color="text-red-500" />
        <Stat label="總 tokens" value={`${(s.total_input_tokens / 1000).toFixed(0)}k in / ${(s.total_output_tokens / 1000).toFixed(0)}k out`} color="text-purple-500" small />
        <Stat label="總對話次" value={s.total_msgs.toLocaleString()} color="text-blue-500" />
      </div>

      {/* 分組 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Free vs Paid 分組</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["free", "monthly", "yearly"].map((name) => {
            const segData = seg[name];
            const emoji = name === "free" ? "🆓" : name === "monthly" ? "💎" : "👑";
            return (
              <div key={name} className="bg-bg-elevated rounded-lg p-3">
                <div className="font-bold mb-2">{emoji} {name}</div>
                <div className="text-xs space-y-1">
                  <div>users: <span className="font-bold">{segData.users}</span></div>
                  <div>總成本: <span className="font-bold text-red-500">${segData.total_cost_usd}</span></div>
                  <div>平均月燒: <span className="font-bold text-amber-500">${segData.avg_cost_per_user_usd}</span></div>
                  <div>平均對話: {segData.avg_msgs_per_user} 次</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakeven */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Banknote className="w-4 h-4" /> Breakeven 對照（目標 70% 毛利）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BreakevenCard plan="Monthly NT$ 299" data={be.monthly_plan} />
          <BreakevenCard plan="Yearly NT$ 2999" data={be.yearly_plan} />
        </div>
      </div>

      {/* Top spenders */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Flame className="w-4 h-4" /> Top 10 spenders（{data.period_days} 天）</h3>
        {top.length === 0 ? (
          <p className="text-fg-muted text-sm">沒人花</p>
        ) : (
          <div className="space-y-1.5">
            {top.map((u: any, i: number) => (
              <div key={u.user_id} className="flex items-center gap-3 bg-bg-elevated rounded p-2.5 text-sm">
                <span className="font-bold w-7 text-accent">{i === 0 ? "🔥" : `#${i + 1}`}</span>
                <span className="flex-1 font-medium">{u.name}</span>
                <span className="chip chip-neutral text-[10px]">{u.plan}</span>
                <span className="text-xs text-fg-muted">{u.msgs} msgs</span>
                <span className="text-xs text-fg-muted">{(u.tokens_total / 1000).toFixed(0)}k tokens</span>
                <span className="font-bold text-red-500">${u.cost_usd}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, small }: { label: string; value: any; color: string; small?: boolean }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
      <div className={`${small ? "text-sm" : "text-2xl"} font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-fg-muted mt-0.5">{label}</div>
    </div>
  );
}

function BreakevenCard({ plan, data }: { plan: string; data: any }) {
  const isGood = data.status === "good";
  return (
    <div className="bg-bg-elevated rounded-lg p-4">
      <h4 className="font-bold mb-2 flex items-center gap-2">
        {plan}
        {isGood ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
      </h4>
      <div className="text-xs space-y-1">
        <div>月收入: <span className="font-bold text-green-500">${data.revenue_usd}</span></div>
        <div>AI 預算（70% 毛利）: <span className="font-bold">${data.ai_budget_70pct_margin}</span></div>
        <div>實際平均: <span className={`font-bold ${isGood ? "text-green-500" : "text-red-500"}`}>${data.actual_avg_cost}</span></div>
        <div className="text-fg-muted mt-2 leading-snug">
          {isGood ? "✅ 在預算內、可達 70% 毛利" : "⚠️ 超預算、要降成本或調訂閱價"}
        </div>
      </div>
    </div>
  );
}
