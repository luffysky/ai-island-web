"use client";
import { useState, type CSSProperties } from "react";
import { Code2, X } from "lucide-react";

/**
 * Grid 實驗室 — 切換不同格子排法（含「豆腐排版」），即時看 + 秀 CSS。
 * 教 grid-template-columns / gap / auto-fit / 跨欄跨列。
 */

const COLORS = ["#fca5a5", "#fcd34d", "#86efac", "#67e8f9", "#a5b4fc", "#f9a8d4", "#fdba74", "#5eead4", "#d8b4fe"];

type Preset = {
  id: string;
  name: string;
  note: string;
  count: number;
  style: (gap: number) => CSSProperties;
  itemStyle?: (i: number) => CSSProperties;
  css: (gap: number) => string;
};

const PRESETS: Preset[] = [
  {
    id: "tofu",
    name: "豆腐排版",
    note: "一格一格大小一致、像切好的豆腐。最整齊、作品牆/相簿常用。",
    count: 9,
    style: (gap) => ({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "1fr", gap }),
    css: (gap) => `.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;   /* 每格一樣高 → 豆腐塊 */
  gap: ${gap}px;
}`,
  },
  {
    id: "cols3",
    name: "固定三欄",
    note: "切成三等分欄位，最基本的 grid。",
    count: 6,
    style: (gap) => ({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap }),
    css: (gap) => `.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${gap}px;
}`,
  },
  {
    id: "autofit",
    name: "自動填滿 auto-fit",
    note: "欄數依寬度自動長出來（RWD 神器），不用寫 media query。",
    count: 8,
    style: (gap) => ({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap }),
    css: (gap) => `.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: ${gap}px;
}`,
  },
  {
    id: "sidebar",
    name: "側欄 + 主內容",
    note: "第一欄固定寬當側欄，第二欄 1fr 吃滿剩餘。",
    count: 2,
    style: (gap) => ({ display: "grid", gridTemplateColumns: "120px 1fr", gap }),
    css: (gap) => `.grid {
  display: grid;
  grid-template-columns: 120px 1fr;  /* 側欄固定、主內容彈性 */
  gap: ${gap}px;
}`,
  },
  {
    id: "feature",
    name: "主打跨格",
    note: "第 1 格跨 2 欄 2 列當主打，其餘小格環繞。",
    count: 5,
    style: (gap) => ({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "60px", gap }),
    itemStyle: (i) => (i === 0 ? { gridColumn: "span 2", gridRow: "span 2" } : {}),
    css: (gap) => `.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${gap}px;
}
.grid > :first-child {
  grid-column: span 2;   /* 主打橫跨 2 欄 */
  grid-row: span 2;      /* 也跨 2 列 */
}`,
  },
];

export function GridPlayground({ title, note }: { title?: string; note?: string }) {
  const [active, setActive] = useState(0);
  const [gap, setGap] = useState(8);
  const [showCss, setShowCss] = useState(false);
  const P = PRESETS[active];

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">🧊 {title ?? "Grid 實驗室（含豆腐排版）"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 排法選擇 */}
      <div className="p-3 flex flex-wrap gap-1.5 border-b border-border">
        {PRESETS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActive(i)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              i === active ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted hover:border-accent hover:text-fg"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 說明 + gap + CSS */}
      <div className="px-3 pt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted flex-1 min-w-[180px]"><b className="text-fg">{P.name}</b>：{P.note}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-fg-muted">gap {gap}px</span>
          <input type="range" min={0} max={20} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="accent-accent w-20" />
          <button onClick={() => setShowCss((v) => !v)} className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 ${showCss ? "bg-accent/20 text-accent" : "bg-bg-elevated text-fg-muted hover:text-accent"}`}><Code2 size={12} /> {showCss ? "收 CSS" : "看 CSS"}</button>
        </div>
      </div>

      {/* 預覽 */}
      <div className="p-3">
        <div style={{ ...P.style(gap), background: "#f8fafc", borderRadius: 8, padding: 10, minHeight: 200, transition: "gap .2s ease" }}>
          {Array.from({ length: P.count }).map((_, i) => (
            <div key={i} style={{ background: COLORS[i % COLORS.length], color: "#1e293b", borderRadius: 6, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, ...(P.itemStyle?.(i) ?? {}) }}>{i + 1}</div>
          ))}
        </div>
        <div className="text-[10px] text-fg-muted mt-1.5">拉 gap 看間距、切換排法看格子怎麼變。「豆腐排版」= 每格一樣大。</div>
      </div>

      {showCss && (
        <div className="mx-3 mb-3 rounded-lg border border-border bg-[#0d1117] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-[11px] text-white/50 font-mono">產生「{P.name}」的 CSS</span>
            <button onClick={() => setShowCss(false)} className="text-white/40 hover:text-white/80"><X size={13} /></button>
          </div>
          <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto text-[#c9d1d9] font-mono whitespace-pre">{P.css(gap)}</pre>
        </div>
      )}
    </div>
  );
}
