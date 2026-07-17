"use client";
import { useState, type CSSProperties } from "react";
import { Code2, RotateCcw, X } from "lucide-react";

/**
 * Flexbox 實驗室 — 點按鈕改 flex 屬性，方塊即時重排、秀出對應 CSS。
 * 教 flex-direction / justify-content / align-items / flex-wrap 四大屬性。
 */

const CARD_COLORS = ["#fca5a5", "#fcd34d", "#86efac", "#67e8f9", "#a5b4fc", "#f9a8d4"];

type Opt = { v: string; label: string };
const DIRECTION: Opt[] = [
  { v: "row", label: "row 橫排" },
  { v: "row-reverse", label: "row-reverse 反向橫" },
  { v: "column", label: "column 直排" },
  { v: "column-reverse", label: "column-reverse 反向直" },
];
const JUSTIFY: Opt[] = [
  { v: "flex-start", label: "flex-start 靠頭" },
  { v: "center", label: "center 置中" },
  { v: "flex-end", label: "flex-end 靠尾" },
  { v: "space-between", label: "space-between 兩端" },
  { v: "space-around", label: "space-around 環繞" },
  { v: "space-evenly", label: "space-evenly 均分" },
];
const ALIGN: Opt[] = [
  { v: "stretch", label: "stretch 撐滿" },
  { v: "flex-start", label: "flex-start 靠上" },
  { v: "center", label: "center 置中" },
  { v: "flex-end", label: "flex-end 靠下" },
];
const WRAP: Opt[] = [
  { v: "nowrap", label: "nowrap 不換行" },
  { v: "wrap", label: "wrap 換行" },
];

function Row({ label, opts, value, onChange }: { label: string; opts: Opt[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-mono text-fg-muted w-[130px] shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`text-[11px] px-2 py-1 rounded border transition ${
              value === o.v ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted hover:border-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FlexPlayground({ title, note }: { title?: string; note?: string }) {
  const [direction, setDirection] = useState("row");
  const [justify, setJustify] = useState("flex-start");
  const [align, setAlign] = useState("stretch");
  const [wrap, setWrap] = useState("nowrap");
  const [count, setCount] = useState(4);
  const [showCss, setShowCss] = useState(false);

  const reset = () => { setDirection("row"); setJustify("flex-start"); setAlign("stretch"); setWrap("nowrap"); setCount(4); };

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: direction as CSSProperties["flexDirection"],
    justifyContent: justify,
    alignItems: align,
    flexWrap: wrap as CSSProperties["flexWrap"],
    gap: 8,
    background: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    height: 220,
    overflow: "auto",
    transition: "all .25s ease",
  };

  const css = `.container {
  display: flex;
  flex-direction: ${direction};
  justify-content: ${justify};
  align-items: ${align};
  flex-wrap: ${wrap};
  gap: 8px;
}`;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🧩 {title ?? "Flexbox 實驗室"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 控制列 */}
      <div className="p-3 space-y-2 border-b border-border">
        <Row label="flex-direction" opts={DIRECTION} value={direction} onChange={setDirection} />
        <Row label="justify-content" opts={JUSTIFY} value={justify} onChange={setJustify} />
        <Row label="align-items" opts={ALIGN} value={align} onChange={setAlign} />
        <Row label="flex-wrap" opts={WRAP} value={wrap} onChange={setWrap} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-fg-muted w-[130px] shrink-0">方塊數量：{count}</span>
          <input type="range" min={1} max={8} value={count} onChange={(e) => setCount(Number(e.target.value))} className="accent-accent flex-1 min-w-[120px] max-w-[200px]" />
          <button onClick={reset} className="text-[11px] px-2 py-1 rounded bg-bg-elevated text-fg-muted hover:text-accent inline-flex items-center gap-1"><RotateCcw size={12} /> 重置</button>
          <button onClick={() => setShowCss((v) => !v)} className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 ${showCss ? "bg-accent/20 text-accent" : "bg-bg-elevated text-fg-muted hover:text-accent"}`}><Code2 size={12} /> {showCss ? "收 CSS" : "看 CSS"}</button>
        </div>
      </div>

      {/* 預覽 */}
      <div className="p-3">
        <div style={containerStyle}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ background: CARD_COLORS[i % CARD_COLORS.length], color: "#1e293b", borderRadius: 6, minWidth: 48, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, padding: "8px 10px" }}>{i + 1}</div>
          ))}
        </div>
        <div className="text-[10px] text-fg-muted mt-1.5">改上面的按鈕、看方塊怎麼動。試試 <b>justify=space-between</b> + <b>align=center</b>。</div>
      </div>

      {showCss && (
        <div className="mx-3 mb-3 rounded-lg border border-border bg-[#0d1117] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-[11px] text-white/50 font-mono">目前設定的 CSS</span>
            <button onClick={() => setShowCss(false)} className="text-white/40 hover:text-white/80"><X size={13} /></button>
          </div>
          <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto text-[#c9d1d9] font-mono whitespace-pre">{css}</pre>
        </div>
      )}
    </div>
  );
}
