"use client";
import { useEffect, useRef, useState } from "react";
import type { WidgetProps } from "@/lib/widgets/types";

type Cfg = { pattern?: "478" | "box" | "calm" };
// 各節奏的階段（秒）：吸 / 憋 / 吐 / 憋
const PATTERNS: Record<string, { phases: [string, number][] }> = {
  "478": { phases: [["吸氣", 4], ["憋住", 7], ["吐氣", 8]] },
  box: { phases: [["吸氣", 4], ["憋住", 4], ["吐氣", 4], ["憋住", 4]] },
  calm: { phases: [["吸氣", 5], ["吐氣", 5]] },
};

export default function BreathingWidget({ config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const pat = PATTERNS[c.pattern ?? "box"] ?? PATTERNS.box;
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;
    const [, secs] = pat.phases[idx];
    timer.current = setTimeout(() => setIdx((i) => (i + 1) % pat.phases.length), secs * 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [running, idx, pat]);

  const [label, secs] = pat.phases[idx];
  const scale = label === "吸氣" ? 1 : label === "吐氣" ? 0.5 : label === "憋住" ? 0.9 : 0.75;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 px-2">
      <div
        className="rounded-full bg-gradient-to-br from-accent/40 to-accent-2/30 grid place-items-center"
        style={{ width: 88, height: 88, transform: `scale(${running ? scale : 0.8})`, transition: `transform ${running ? secs : 0.4}s ease-in-out` }}
      >
        <span className="text-sm font-medium text-fg">{running ? label : "呼吸"}</span>
      </div>
      <button onClick={() => { setRunning((r) => !r); setIdx(0); }} className="text-xs px-4 py-1.5 rounded-full bg-accent text-black font-medium">
        {running ? "停止" : "開始"}
      </button>
    </div>
  );
}
