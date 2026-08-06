"use client";
import { useEffect, useState } from "react";
import type { WidgetProps } from "@/lib/widgets/types";

type Cfg = { title?: string; sinceDate?: string; showDays?: boolean };

export default function AnniversaryWidget({ config }: WidgetProps) {
  const c = (config ?? {}) as Cfg;
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!c.sinceDate) return <Frame title={c.title || "紀念日"}><p className="text-sm text-fg-muted">設定裡填起算日</p></Frame>;
  if (!today) return <Frame title={c.title || "紀念日"}><p className="text-fg-muted">…</p></Frame>;

  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const since = new Date(c.sinceDate + "T00:00:00").getTime();
  const days = Math.floor((t0 - since) / 86400000);

  return (
    <Frame title={c.title || "紀念日"}>
      <p className="leading-none"><span className="text-xs text-fg-muted">第 </span><span className="text-4xl font-bold text-accent tabular-nums">{days + 1}</span><span className="text-sm text-fg-muted"> 天</span></p>
      <p className="text-xs text-fg-muted mt-1">自 {c.sinceDate}（{days} 天前）</p>
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
