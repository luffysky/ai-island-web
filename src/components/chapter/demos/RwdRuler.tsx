"use client";
import { useEffect, useRef, useState } from "react";
import { Smartphone, Tablet, Monitor, Menu, Code2, X } from "lucide-react";

/**
 * RWD 拉尺 — 一個真實的響應式頁面（導覽列 + 卡片牆），拖寬度看它怎麼隨斷點重排：
 * 導覽列窄屏收成漢堡、卡片 4→2→1 欄。顯示現在幾 px、在哪個斷點。
 */

const BP = { phone: 480, tablet: 768 };
const COLORS = ["#fca5a5", "#fcd34d", "#86efac", "#67e8f9", "#a5b4fc", "#f9a8d4"];

function deviceOf(w: number) {
  if (w < BP.phone) return { label: "手機", icon: Smartphone, key: "phone" };
  if (w < BP.tablet) return { label: "平板", icon: Tablet, key: "tablet" };
  return { label: "桌機", icon: Monitor, key: "desktop" };
}

export function RwdRuler({ title, note }: { title?: string; note?: string }) {
  const [width, setWidth] = useState<number | null>(null);
  const [maxW, setMaxW] = useState(0);
  const [showCss, setShowCss] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const measure = () => { if (wrapRef.current) setMaxW(wrapRef.current.clientWidth); };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const effW = width == null ? maxW : Math.min(width, maxW);
  const dev = deviceOf(effW || maxW);
  const DevIcon = dev.icon;
  const cols = (effW || maxW) < BP.phone ? 1 : (effW || maxW) < BP.tablet ? 2 : 4;
  const mobileNav = (effW || maxW) < BP.phone;

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || !wrapRef.current) return;
    const left = wrapRef.current.getBoundingClientRect().left;
    setWidth(Math.max(240, Math.min(e.clientX - left, maxW)));
  };

  const presets = [
    { label: "手機", w: 375, icon: Smartphone },
    { label: "平板", w: 720, icon: Tablet },
    { label: "桌機", w: 9999, icon: Monitor },
  ];

  const css = `/* 卡片牆：欄數隨寬度變 */
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 768px) { .cards { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) {
  .cards { grid-template-columns: 1fr; }
  .nav-links { display: none; }      /* 連結收起來 */
  .nav-burger { display: block; }    /* 改顯示 ☰ 漢堡 */
}`;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">📐 {title ?? "RWD 拉尺 · 拖寬度看重排"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 尺規工具列 */}
      <div className="px-3 pt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs inline-flex items-center gap-1.5 font-semibold tabular-nums">
          <DevIcon size={14} className="text-accent" /> {dev.label} · {effW || "—"}px
        </span>
        <div className="flex items-center gap-1.5">
          {presets.map((p) => (
            <button key={p.label} onClick={() => setWidth(p.w >= maxW ? null : p.w)} className="text-[11px] px-2 py-1 rounded bg-bg-elevated hover:bg-accent/15 text-fg-muted hover:text-accent inline-flex items-center gap-1"><p.icon size={12} /> {p.label}</button>
          ))}
          <button onClick={() => setShowCss((v) => !v)} className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 ${showCss ? "bg-accent/20 text-accent" : "bg-bg-elevated text-fg-muted hover:text-accent"}`}><Code2 size={12} /> {showCss ? "收 CSS" : "看 CSS"}</button>
        </div>
      </div>

      {/* 斷點指示 */}
      <div className="px-3 pt-2">
        <div className="flex text-[10px] text-fg-muted rounded overflow-hidden border border-border">
          {[{ k: "phone", t: `手機 <${BP.phone}` }, { k: "tablet", t: `平板 <${BP.tablet}` }, { k: "desktop", t: `桌機 ≥${BP.tablet}` }].map((s) => (
            <div key={s.k} className={`flex-1 text-center py-0.5 ${dev.key === s.k ? "bg-accent text-black font-semibold" : ""}`}>{s.t}</div>
          ))}
        </div>
      </div>

      {/* 可拖曳預覽 */}
      <div ref={wrapRef} className="p-3 pt-2">
        <div className="relative" style={{ width: effW ? effW : "100%", maxWidth: "100%", transition: dragging.current ? "none" : "width .2s ease" }}>
          <div className="rounded-lg border border-border overflow-hidden" style={{ background: "#f8fafc" }}>
            {/* nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#a5b4fc", padding: "8px 12px", color: "#1e293b" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>LOGO</span>
              {mobileNav ? (
                <Menu size={18} />
              ) : (
                <div style={{ display: "flex", gap: 12, fontSize: 12, fontWeight: 600 }}>
                  <span>首頁</span><span>課程</span><span>關於</span><span>聯絡</span>
                </div>
              )}
            </div>
            {/* cards */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, padding: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: COLORS[i % COLORS.length], color: "#1e293b", borderRadius: 6, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, transition: "all .2s ease" }}>卡 {i + 1}</div>
              ))}
            </div>
          </div>
          <div
            onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
            onPointerMove={onMove}
            onPointerUp={(e) => { dragging.current = false; try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {} }}
            title="拖我改寬度"
            className="absolute top-0 -right-1 h-full w-3 cursor-ew-resize items-center justify-center hidden sm:flex touch-none"
          >
            <div className="h-10 w-1.5 rounded-full bg-accent/60 hover:bg-accent" />
          </div>
        </div>
        <div className="text-[10px] text-fg-muted mt-1.5 hidden sm:block">👉 拖右邊、把畫面拉窄到 480px 以下，看導覽列收成 ☰、卡片變一欄</div>
        <div className="text-[10px] text-fg-muted mt-1.5 sm:hidden">👆 用上面「手機/平板/桌機」按鈕切換</div>
      </div>

      {showCss && (
        <div className="mx-3 mb-3 rounded-lg border border-border bg-[#0d1117] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-[11px] text-white/50 font-mono">這個 RWD 頁面的 CSS（media query）</span>
            <button onClick={() => setShowCss(false)} className="text-white/40 hover:text-white/80"><X size={13} /></button>
          </div>
          <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto text-[#c9d1d9] font-mono whitespace-pre">{css}</pre>
        </div>
      )}
    </div>
  );
}
