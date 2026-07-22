"use client";

import { useEffect, useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

export interface GuideStep {
  title: string;
  desc?: string;
}

/**
 * 功能「使用說明 / 使用教學」卡——放在各功能頁最上面。
 * 首次進頁預設展開；收合狀態記到 localStorage（回訪不再擋路，但隨時能點開）。
 * 用同一個元件保證全站說明風格一致。
 */
export function FeatureGuide({
  id,
  title = "使用說明",
  intro,
  steps,
  tip,
}: {
  id: string;                 // localStorage key 用（每個功能不同）
  title?: string;
  intro?: string;
  steps: GuideStep[];
  tip?: string;
}) {
  const [open, setOpen] = useState(true);
  const key = `guide_collapsed_${id}`;

  useEffect(() => {
    try { if (localStorage.getItem(key) === "1") setOpen(false); } catch { /* ignore */ }
  }, [key]);

  const toggle = () =>
    setOpen((v) => {
      const n = !v;
      try { localStorage.setItem(key, n ? "0" : "1"); } catch { /* ignore */ }
      return n;
    });

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-3 mb-4">
      <button onClick={toggle} className="w-full flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
        <HelpCircle className="w-4 h-4 shrink-0" />
        <span>{title}</span>
        <span className="ml-auto text-xs font-normal text-black/40 dark:text-white/40 inline-flex items-center gap-1">
          {open ? <>收起 <ChevronUp className="w-4 h-4" /></> : <>怎麼用？ <ChevronDown className="w-4 h-4" /></>}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {intro && <p className="text-xs text-black/60 dark:text-white/60 mb-3 leading-relaxed">{intro}</p>}
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-black/80 dark:text-white/85">{s.title}</div>
                  {s.desc && <div className="text-xs text-black/55 dark:text-white/55 leading-relaxed mt-0.5">{s.desc}</div>}
                </div>
              </li>
            ))}
          </ol>
          {tip && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
