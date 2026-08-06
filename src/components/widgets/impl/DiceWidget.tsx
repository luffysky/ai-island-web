"use client";
import { useState } from "react";
import type { WidgetProps } from "@/lib/widgets/types";

type Cfg = { sides?: number; count?: number };
const PIPS: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };

export default function DiceWidget({ config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const sides = Math.min(100, Math.max(2, c.sides ?? 6));
  const count = Math.min(10, Math.max(1, c.count ?? 1));
  const [vals, setVals] = useState<number[]>(() => Array.from({ length: count }, () => 1));
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    setRolling(true);
    let n = 0;
    const iv = setInterval(() => {
      setVals(Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)));
      if (++n >= 8) { clearInterval(iv); setRolling(false); }
    }, 60);
  };

  const total = vals.reduce((a, b) => a + b, 0);
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 px-2">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {vals.map((v, i) => (
          <span key={i} className={`${sides === 6 ? "text-4xl" : "text-2xl font-bold tabular-nums w-10 h-10 grid place-items-center rounded-lg border border-border"} ${rolling ? "opacity-60" : ""}`}>
            {sides === 6 ? PIPS[v] : v}
          </span>
        ))}
      </div>
      {count > 1 && <div className="text-xs text-fg-muted">合計 {total}</div>}
      <button onClick={roll} disabled={rolling} className="text-xs px-4 py-1.5 rounded-full bg-accent text-black font-medium disabled:opacity-50">🎲 擲 d{sides}{count > 1 ? `×${count}` : ""}</button>
    </div>
  );
}
