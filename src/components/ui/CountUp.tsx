"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 數字滾動動畫（easeOutCubic）。值變動時從舊值滾到新值；尊重 prefers-reduced-motion。
 *   <CountUp value={profile.z_coin} />
 *   <CountUp value={1234} prefix="$" decimals={2} />
 */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to) { setDisplay(to); fromRef.current = to; return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const text = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span className={className}>{prefix}{text}{suffix}</span>;
}
