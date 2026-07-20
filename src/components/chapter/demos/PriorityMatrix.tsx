"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

/**
 * 2×2 象限盤點 — 把一組項目點選放進四象限，看每格的建議。
 * 點選放置（不用拖曳，觸控/RWD 友善）。config 驅動、可複用
 * （職涯：AI取代性×你的優勢；PM：影響×成本；心法：重要×緊急）。
 * config：{ xLabel,yLabel,xLow,xHigh,yLow,yHigh, quadrants:{tl,tr,bl,br:{title,advice}}, items:[str] }
 */
type Cell = "tl" | "tr" | "bl" | "br";
type Cfg = {
  xLabel?: string; yLabel?: string; xLow?: string; xHigh?: string; yLow?: string; yHigh?: string;
  quadrants: Record<Cell, { title: string; advice: string }>;
  items: string[];
};

export function PriorityMatrix({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = config as unknown as Cfg | undefined;
  const [place, setPlace] = useState<Record<string, Cell>>({});
  const [sel, setSel] = useState<string | null>(null);
  if (!cfg?.items?.length || !cfg.quadrants) return null;

  const unplaced = cfg.items.filter((it) => !(it in place));
  const inCell = (c: Cell) => cfg.items.filter((it) => place[it] === c);
  const put = (c: Cell) => { if (sel) { setPlace((p) => ({ ...p, [sel]: c })); setSel(null); } };
  const pop = (it: string) => setPlace((p) => { const n = { ...p }; delete n[it]; return n; });

  const Q = ({ c }: { c: Cell }) => {
    const q = cfg.quadrants[c];
    return (
      <button onClick={() => put(c)} disabled={!sel}
        className={`text-left rounded-lg border p-2 min-h-[76px] transition ${sel ? "border-accent bg-accent/5 hover:bg-accent/10 cursor-pointer" : "border-border bg-bg"}`}>
        <div className="text-[11px] font-semibold mb-1 break-words">{q.title}</div>
        <div className="flex flex-wrap gap-1">
          {inCell(c).map((it) => (
            <span key={it} onClick={(e) => { e.stopPropagation(); pop(it); }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent break-words cursor-pointer" title="點一下移回">{it}</span>
          ))}
        </div>
        <div className="text-[10px] text-fg-muted mt-1 leading-snug break-words">{q.advice}</div>
      </button>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🗂️ {title ?? "2×2 象限盤點"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 待放項目 */}
      <div className="p-3 border-b border-border">
        <div className="text-[11px] text-fg-muted mb-1.5">{unplaced.length ? "點一個項目、再點下面的象限放進去：" : "都放好了！點象限裡的項目可移回。"}</div>
        <div className="flex flex-wrap gap-1.5">
          {unplaced.map((it) => (
            <button key={it} onClick={() => setSel(sel === it ? null : it)}
              className={`text-[11px] px-2 py-1 rounded-lg border transition break-words ${sel === it ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted hover:border-accent"}`}>{it}</button>
          ))}
          {!unplaced.length && <span className="text-[11px] text-fg-muted">（空）</span>}
        </div>
      </div>

      {/* 象限 */}
      <div className="p-3">
        <div className="text-[10px] text-fg-muted text-center mb-1">↑ {cfg.yHigh ?? cfg.yLabel ?? "高"}</div>
        <div className="grid grid-cols-2 gap-2">
          <Q c="tl" /><Q c="tr" />
          <Q c="bl" /><Q c="br" />
        </div>
        <div className="flex justify-between text-[10px] text-fg-muted mt-1">
          <span>← {cfg.xLow ?? "低"}</span>
          <span>{cfg.yLow ?? ""}</span>
          <span>{cfg.xHigh ?? "高"} →</span>
        </div>
        <div className="text-[10px] text-fg-muted text-center mt-1">橫軸：{cfg.xLabel} · 縱軸：{cfg.yLabel}</div>
      </div>

      {Object.keys(place).length > 0 && (
        <div className="px-3 pb-3">
          <button onClick={() => { setPlace({}); setSel(null); }} className="text-[11px] text-accent inline-flex items-center gap-1 hover:underline"><RotateCcw size={11} /> 清空重放</button>
        </div>
      )}
    </div>
  );
}
