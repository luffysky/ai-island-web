"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";

/**
 * GitHub-style streak heatmap（過去 90 天）。
 * 每格代表一天、顏色深淺依當天「學習行為次數」。
 */

type DayPoint = { date: string; count: number };

const DAYS = 90;

function tone(count: number): string {
  if (count === 0) return "bg-bg-elevated/60";
  if (count < 3) return "bg-accent/30";
  if (count < 7) return "bg-accent/55";
  if (count < 15) return "bg-accent/80";
  return "bg-accent";
}

export function StreakHeatmap() {
  const [points, setPoints] = useState<DayPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/heatmap")
      .then((r) => r.json())
      .then((j) => setPoints(j.points ?? []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, []);

  const cells = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of points ?? []) map.set(p.date, p.count);
    const out: DayPoint[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: map.get(key) ?? 0 });
    }
    return out;
  }, [points]);

  const totalDaysActive = cells.filter((c) => c.count > 0).length;
  const totalActions = cells.reduce((s, c) => s + c.count, 0);
  const currentStreak = (() => {
    let n = 0;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].count > 0) n++;
      else break;
    }
    return n;
  })();

  return (
    <section className="rounded-xl bg-bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2">🌱 學習熱力圖（90 天）</h2>
        <div className="text-[10px] text-fg-muted">
          活躍 {totalDaysActive} 天 · {totalActions} 次互動 · 連續 {currentStreak} 天
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-fg-muted text-sm">
          <Loader2 size={14} className="animate-spin inline mr-1" /> 載入中
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 max-w-full">
            {cells.map((c) => (
              <span
                key={c.date}
                title={`${c.date}：${c.count} 次互動`}
                className={`w-3 h-3 rounded-sm ${tone(c.count)} hover:ring-2 hover:ring-accent/40 transition`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-fg-muted">
            少
            {[0, 2, 6, 14, 20].map((n) => (
              <span key={n} className={`inline-block w-3 h-3 rounded-sm ${tone(n)}`} />
            ))}
            多
          </div>
        </>
      )}
    </section>
  );
}
