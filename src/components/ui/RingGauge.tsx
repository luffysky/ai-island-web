"use client";

import { useEffect, useState } from "react";

/** 環形量表（百分比）。≥80% 變橘、≥100% 變紅。掛載時從 0 補滿。 */
export function RingGauge({ pct, size = 46, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(pct); return; }
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const clamped = Math.min(100, Math.max(0, shown));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamped / 100);
  const color = pct >= 100 ? "#ef4444" : pct >= 80 ? "#fb923c" : "#34d399";

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-bg-elevated" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 850ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}
