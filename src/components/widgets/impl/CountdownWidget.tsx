"use client";
import { useEffect, useState } from "react";
import type { WidgetProps } from "@/lib/widgets/types";

type Cfg = { title?: string; targetDate?: string };

export default function CountdownWidget({ config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!c.targetDate) return <Frame title={c.title || "倒數"}><p className="text-sm text-fg-muted">設定裡填目標日期</p></Frame>;
  if (!today) return <Frame title={c.title || "倒數"}><p className="text-fg-muted">…</p></Frame>;

  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(c.targetDate + "T00:00:00");
  const days = Math.round((target.getTime() - t0) / 86400000);
  const label = days > 0 ? "還有" : days < 0 ? "已過" : "就是今天";

  return (
    <Frame title={c.title || "倒數"}>
      {days === 0 ? (
        <p className="text-3xl font-bold text-accent">🎉 就是今天</p>
      ) : (
        <p className="leading-none"><span className="text-xs text-fg-muted">{label} </span><span className="text-4xl font-bold text-accent tabular-nums">{Math.abs(days)}</span><span className="text-sm text-fg-muted"> 天</span></p>
      )}
      <p className="text-xs text-fg-muted mt-1">{c.targetDate}</p>
    </Frame>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-2">
      <div className="text-xs font-semibold text-fg-muted mb-1">{title}</div>
      {children}
    </div>
  );
}
