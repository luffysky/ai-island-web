"use client";
import { useState } from "react";
import { Code2, X } from "lucide-react";

/**
 * 盒模型實驗室 — 拉 margin / border / padding 滑桿，即時看盒子脹縮、
 * 看四層怎麼疊、算出實際佔位大小。教 CSS box model 與 box-sizing。
 */

function Slider({ label, value, set, max, color }: { label: string; value: number; set: (n: number) => void; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono w-[70px] shrink-0" style={{ color }}>{label}</span>
      <input type="range" min={0} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="flex-1 min-w-[80px]" style={{ accentColor: color }} />
      <span className="text-[11px] font-mono w-[36px] text-right tabular-nums text-fg-muted">{value}px</span>
    </div>
  );
}

export function BoxModel({ title, note }: { title?: string; note?: string }) {
  const [margin, setMargin] = useState(16);
  const [border, setBorder] = useState(6);
  const [padding, setPadding] = useState(20);
  const [contentBox, setContentBox] = useState(false); // false = border-box(預設教學) / true = content-box
  const [showCss, setShowCss] = useState(false);

  const CONTENT_W = 120, CONTENT_H = 50;
  // content-box：總寬 = content + padding*2 + border*2；border-box：總寬固定 = 設定寬
  const outerW = contentBox ? CONTENT_W + (padding + border) * 2 : CONTENT_W;
  const totalW = outerW + margin * 2;

  const css = `.box {
  width: ${CONTENT_W}px;
  box-sizing: ${contentBox ? "content-box" : "border-box"};
  margin: ${margin}px;
  border: ${border}px solid;
  padding: ${padding}px;
}
/* 實際佔位寬度（含 margin）≈ ${totalW}px */`;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">📦 {title ?? "盒模型實驗室"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 控制 */}
      <div className="p-3 space-y-2 border-b border-border">
        <Slider label="margin" value={margin} set={setMargin} max={40} color="#f59e0b" />
        <Slider label="border" value={border} set={setBorder} max={20} color="#334155" />
        <Slider label="padding" value={padding} set={setPadding} max={40} color="#10b981" />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-fg-muted">box-sizing：</span>
          {[{ v: false, l: "border-box（推薦）" }, { v: true, l: "content-box（預設）" }].map((o) => (
            <button key={String(o.v)} onClick={() => setContentBox(o.v)}
              className={`text-[11px] px-2 py-1 rounded border ${contentBox === o.v ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted"}`}>{o.l}</button>
          ))}
          <button onClick={() => setShowCss((v) => !v)} className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 ml-auto ${showCss ? "bg-accent/20 text-accent" : "bg-bg-elevated text-fg-muted hover:text-accent"}`}><Code2 size={12} /> {showCss ? "收 CSS" : "看 CSS"}</button>
        </div>
      </div>

      {/* 預覽：四層盒子 */}
      <div className="p-3 flex flex-col items-center" style={{ background: "#f8fafc", overflow: "auto" }}>
        {/* margin 層 */}
        <div style={{ background: "repeating-linear-gradient(45deg,#fde68a,#fde68a 6px,#fef3c7 6px,#fef3c7 12px)", padding: margin, display: "inline-block", transition: "all .15s ease" }}>
          {/* border 層 */}
          <div style={{ background: "#334155", padding: border, transition: "all .15s ease" }}>
            {/* padding 層 */}
            <div style={{ background: "#a7f3d0", padding, transition: "all .15s ease" }}>
              {/* content */}
              <div style={{ width: CONTENT_W, height: CONTENT_H, background: "#60a5fa", color: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>content</div>
            </div>
          </div>
        </div>
      </div>

      {/* 圖例 + 尺寸 */}
      <div className="px-3 py-2 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fg-muted">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#fde68a" }} /> margin（外距·透明）</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#334155" }} /> border（邊框）</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#a7f3d0" }} /> padding（內距）</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#60a5fa" }} /> content</span>
        <span className="ml-auto font-mono text-fg">實際佔位寬 ≈ {totalW}px</span>
      </div>
      <div className="px-3 pb-2 text-[10px] text-fg-muted">
        切到 <b>content-box</b>：加 padding/border 會把盒子「撐大」（總寬變）。切到 <b>border-box</b>：width 就是最終寬、padding/border 往內縮——這就是為什麼大家都用 border-box。
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
