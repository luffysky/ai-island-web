import Link from "next/link";

/**
 * 後台頁 hero header — 跟 Dashboard / 行銷主控台 / Lottie 設定 一致的視覺
 *
 * 用法：
 *   <PageHero emoji="💰" title="訂單管理" desc="近 30 天 ..." gradient="from-emerald-500/10 via-green-500/10 to-yellow-500/10">
 *     <Link href="...">操作 button</Link>
 *   </PageHero>
 */
export function PageHero({
  emoji,
  title,
  desc,
  gradient = "from-purple-500/10 via-pink-500/10 to-blue-500/10",
  borderColor = "border-purple-500/30",
  children,
}: {
  emoji: string;
  title: string;
  desc?: string;
  gradient?: string;
  borderColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${borderColor} rounded-2xl p-5`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2">
            <span className="text-3xl">{emoji}</span>
            {title}
          </h1>
          {desc && <p className="text-sm text-fg-muted leading-relaxed">{desc}</p>}
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/** 後台 stat 卡 — 跟 Dashboard 一致的視覺、含 trend arrow */
export function AdminStatCard({
  label, value, hint, color = "text-fg",
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  color?: string;
  trend?: { pct: number; dir: "up" | "down" | "flat" };
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4 hover:border-accent/40 transition relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/[0.03] opacity-0 group-hover:opacity-100 transition" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs text-fg-muted">{label}</div>
          {trend && trend.dir !== "flat" && (
            <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
              trend.dir === "up" ? "text-emerald-400" : "text-red-400"
            }`}>
              {trend.dir === "up" ? "▲" : "▼"} {Math.abs(trend.pct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
        {hint && <div className="text-[11px] text-fg-muted mt-1 leading-tight">{hint}</div>}
      </div>
    </div>
  );
}
