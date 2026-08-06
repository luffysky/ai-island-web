"use client";
import { useEffect, useState } from "react";
import type { WidgetProps } from "@/lib/widgets/types";

type Cfg = { zone1?: string; zone2?: string; zone3?: string; use24h?: boolean };

function fmt(tz: string, use24h: boolean): { time: string; label: string } | null {
  try {
    const time = new Intl.DateTimeFormat("zh-TW", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: !use24h }).format(new Date());
    const label = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    return { time, label };
  } catch {
    return null;
  }
}

export default function WorldClockWidget({ config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(t); }, []);
  const zones = [c.zone1 || "Asia/Taipei", c.zone2 || "America/New_York", c.zone3 || "Europe/London"].filter(Boolean);
  const use24h = c.use24h ?? true;

  return (
    <div className="h-full flex flex-col justify-center gap-1.5 px-3">
      {zones.map((tz) => {
        const f = fmt(tz, use24h);
        if (!f) return null;
        return (
          <div key={tz} className="flex items-center justify-between">
            <span className="text-sm text-fg-muted truncate">{f.label}</span>
            <span className="text-lg font-bold tabular-nums text-fg">{f.time}</span>
          </div>
        );
      })}
    </div>
  );
}
