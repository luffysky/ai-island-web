"use client";
import { useEffect, useState } from "react";
import type { WidgetProps } from "@/lib/widgets/types";

const WD = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
type Cfg = { use24h?: boolean; showSeconds?: boolean; showGregorian?: boolean; showWeekday?: boolean };

export default function DateTimeWidget({ config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), c.showSeconds ? 1000 : 15000);
    return () => clearInterval(t);
  }, [c.showSeconds]);
  if (!now) return <div className="h-full grid place-items-center text-fg-muted text-sm">…</div>;

  let h = now.getHours();
  const ampm = h < 12 ? "上午" : "下午";
  if (!c.use24h) h = h % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const time = `${c.use24h ? String(h).padStart(2, "0") : h}:${mm}${c.showSeconds ? `:${ss}` : ""}`;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-2">
      <div className="text-4xl sm:text-5xl font-bold tabular-nums text-fg leading-none">
        {!c.use24h && <span className="text-base font-medium text-fg-muted mr-1">{ampm}</span>}
        {time}
      </div>
      {(c.showGregorian ?? true) && (
        <div className="text-sm text-fg-muted mt-2">
          {now.getFullYear()} / {now.getMonth() + 1} / {now.getDate()}
          {(c.showWeekday ?? true) && <span className="ml-2">{WD[now.getDay()]}</span>}
        </div>
      )}
    </div>
  );
}
