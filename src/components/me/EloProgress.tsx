import { Trophy } from "lucide-react";

const ELO_TIERS = [
  { min: 0,    max: 1199, label: "萌新",   emoji: "🌱", color: "from-gray-500 to-gray-400",       text: "text-gray-300" },
  { min: 1200, max: 1399, label: "新手",   emoji: "🥉", color: "from-amber-700 to-amber-600",     text: "text-amber-400" },
  { min: 1400, max: 1599, label: "熟手",   emoji: "🥈", color: "from-slate-400 to-slate-300",     text: "text-slate-300" },
  { min: 1600, max: 1799, label: "高手",   emoji: "🥇", color: "from-yellow-500 to-yellow-400",   text: "text-yellow-400" },
  { min: 1800, max: 1999, label: "大師",   emoji: "💎", color: "from-cyan-400 to-blue-400",       text: "text-cyan-300" },
  { min: 2000, max: 2199, label: "宗師",   emoji: "👑", color: "from-purple-500 to-pink-500",     text: "text-purple-300" },
  { min: 2200, max: 9999, label: "傳奇",   emoji: "🏆", color: "from-orange-400 via-pink-500 to-purple-500 animate-pulse-glow", text: "text-orange-300" },
];

function getTier(rating: number) {
  return ELO_TIERS.find((t) => rating >= t.min && rating <= t.max) ?? ELO_TIERS[0];
}

function getNextTier(rating: number) {
  return ELO_TIERS.find((t) => t.min > rating);
}

export function EloProgress({
  rating,
  recentDeltas,
}: {
  rating: number;
  recentDeltas?: Array<{ delta: number; at: string }>;
}) {
  const tier = getTier(rating);
  const next = getNextTier(rating);
  const progressInTier =
    rating < tier.min
      ? 0
      : next
      ? ((rating - tier.min) / (next.min - tier.min)) * 100
      : 100;

  return (
    <section className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`text-3xl ${tier.text}`}>{tier.emoji}</div>
          <div>
            <div className="text-xs text-fg-muted">你的解題段位</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${tier.text}`}>{tier.label}</span>
              <span className="text-lg font-mono text-fg-muted">{rating}</span>
            </div>
          </div>
        </div>
        {recentDeltas && recentDeltas.length > 0 && (
          <RecentSparkline deltas={recentDeltas} />
        )}
      </header>

      {/* 進度條 */}
      {next ? (
        <div>
          <div className="flex items-center justify-between text-[10px] text-fg-muted mb-1">
            <span>
              {tier.emoji} {tier.label}（{tier.min}）
            </span>
            <span>
              再 <strong className="text-fg">{next.min - rating}</strong> 分到 {next.emoji} {next.label}
            </span>
          </div>
          <div className="h-2.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${tier.color} transition-all duration-700`}
              style={{ width: `${Math.max(2, Math.min(100, progressInTier))}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-sm">
          <Trophy size={18} className="inline mr-1 text-orange-300" />
          已達最高段位、繼續維持寶座
        </div>
      )}

      <p className="text-[11px] text-fg-muted leading-relaxed">
        💡 段位由「每日測驗」決定。答對高難度題或連勝會加分快、答錯掉分。
        ELO 系統會自動配對適合你難度的題目（±80 分內優先）、不會太簡單也不會太難。
      </p>
    </section>
  );
}

function RecentSparkline({ deltas }: { deltas: Array<{ delta: number; at: string }> }) {
  // 顯示最近 5 場、用顏色 + 數字
  const latest = deltas.slice(0, 5);
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="text-fg-muted mr-1">最近</span>
      {latest.map((d, i) => (
        <span
          key={i}
          className={`px-1.5 py-0.5 rounded font-mono font-bold ${
            d.delta > 0
              ? "bg-emerald-500/15 text-emerald-400"
              : d.delta < 0
              ? "bg-red-500/15 text-red-400"
              : "bg-bg-elevated text-fg-muted"
          }`}
          title={new Date(d.at).toLocaleString("zh-TW")}
        >
          {d.delta > 0 ? "+" : ""}{d.delta}
        </span>
      ))}
    </div>
  );
}
