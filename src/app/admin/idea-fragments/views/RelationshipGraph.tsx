"use client";

import { useMemo, useState } from "react";

type Frag = { id: string; title: string; tags: string[]; category: string | null };
type Pair = { a_id: string; b_id: string; similarity: number };

const PALETTE = ["#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#ef4444", "#3b82f6", "#eab308"];

const W = 900;
const H = 720;

/**
 * 碎片關聯圖：node = 碎片，edge = 兩碎片有共同標籤（線越粗 = 共用越多）。
 * 圓形佈局、純 SVG、無外部依賴。label 放在環外、hover 高亮相連碎片。
 */
export function RelationshipGraph({ fragments, onSelect, semanticPairs = [] }: { fragments: Frag[]; onSelect: (id: string) => void; semanticPairs?: Pair[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges, categoryColor } = useMemo(() => {
    const cx = W / 2, cy = H / 2;
    const R = Math.min(cx, cy) - 130;
    const n = fragments.length;

    const cats = Array.from(new Set(fragments.map((f) => f.category).filter(Boolean))) as string[];
    const categoryColor = new Map<string, string>();
    cats.forEach((c, i) => categoryColor.set(c, PALETTE[i % PALETTE.length]));

    const nodes = fragments.map((f, i) => {
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      return {
        ...f,
        x: cx + R * cos,
        y: cy + R * sin,
        cos, sin,
        color: f.category ? categoryColor.get(f.category)! : "#94a3b8",
        degree: 0,
      };
    });

    const edges: { a: string; b: string; ax: number; ay: number; bx: number; by: number; mx: number; my: number; shared: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = (nodes[i].tags ?? []).filter((t) => (nodes[j].tags ?? []).includes(t)).length;
        if (shared > 0) {
          // 控制點往圓心拉一點 → 微彎曲線，比直線好看
          const mx = (nodes[i].x + nodes[j].x) / 2;
          const my = (nodes[i].y + nodes[j].y) / 2;
          edges.push({
            a: nodes[i].id, b: nodes[j].id,
            ax: nodes[i].x, ay: nodes[i].y, bx: nodes[j].x, by: nodes[j].y,
            mx: mx + (cx - mx) * 0.25, my: my + (cy - my) * 0.25,
            shared,
          });
          nodes[i].degree += shared;
          nodes[j].degree += shared;
        }
      }
    }
    return { nodes, edges, categoryColor };
  }, [fragments]);

  if (fragments.length < 2) {
    return <div className="text-center text-fg-muted text-sm py-12">至少要 2 個碎片才畫得出關聯圖。</div>;
  }

  const connected = (id: string) =>
    hover === id || edges.some((e) => (e.a === hover && e.b === id) || (e.b === hover && e.a === id));

  // 語意「意外配對」邊（紫色虛線、跟標籤邊區分）
  const pos = new Map(nodes.map((n) => [n.id, n]));
  const semEdges = semanticPairs
    .map((p) => ({ a: pos.get(p.a_id), b: pos.get(p.b_id), sim: p.similarity }))
    .filter((e) => e.a && e.b) as { a: typeof nodes[0]; b: typeof nodes[0]; sim: number }[];

  return (
    <div className="bg-gradient-to-br from-bg-card to-bg-elevated/40 border border-border rounded-2xl p-3">
      <div className="text-xs text-fg-muted mb-1 px-2">
        {edges.length} 條標籤關聯{semEdges.length > 0 && <span className="text-violet-300"> · {semEdges.length} 條語意意外配對（紫虛線）</span>} · 滑過碎片看它連到誰 · 點碎片可定位
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        <defs>
          <radialGradient id="ig-bg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="var(--accent, #f59e0b)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="ig-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx={W / 2} cy={H / 2} r={Math.min(W, H) / 2 - 40} fill="url(#ig-bg)" />

        {/* edges（微彎曲線） */}
        {edges.map((e, i) => {
          const active = !hover || e.a === hover || e.b === hover;
          return (
            <path
              key={i}
              d={`M ${e.ax} ${e.ay} Q ${e.mx} ${e.my} ${e.bx} ${e.by}`}
              fill="none"
              stroke={active ? "var(--accent, #f59e0b)" : "#475569"}
              strokeOpacity={active ? Math.min(0.25 + e.shared * 0.22, 0.85) : 0.05}
              strokeWidth={active ? Math.min(1.5 + e.shared * 1.2, 6) : 0.8}
              strokeLinecap="round"
            />
          );
        })}

        {/* 語意意外配對邊（紫色虛線） */}
        {semEdges.map((e, i) => {
          const active = !hover || e.a.id === hover || e.b.id === hover;
          return (
            <line
              key={`sem-${i}`}
              x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
              stroke="#a78bfa"
              strokeOpacity={active ? 0.7 : 0.08}
              strokeWidth={active ? 2 : 0.8}
              strokeDasharray="7 5"
              strokeLinecap="round"
            />
          );
        })}

        {/* nodes */}
        {nodes.map((nd) => {
          const r = 12 + Math.min(nd.degree * 2, 20);
          const isHover = hover === nd.id;
          const dim = hover && !connected(nd.id);
          const fs = isHover ? 22 : 18;
          const label = nd.title.length > 12 ? nd.title.slice(0, 12) + "…" : nd.title;
          const anchor = nd.cos < -0.3 ? "end" : nd.cos > 0.3 ? "start" : "middle";
          // label pill 幾何（CJK 約 1em 寬、估算背景大小，避免筆畫糊在一起）
          const padX = 8, padY = 5;
          const textW = label.length * fs * 1.02;
          const pillW = textW + padX * 2;
          const pillH = fs + padY * 2;
          const gap = r + 12;
          const cxL = nd.x + nd.cos * gap;
          const cyL = nd.y + nd.sin * gap;
          const pillX = anchor === "end" ? cxL - pillW : anchor === "start" ? cxL : cxL - pillW / 2;
          const pillY = cyL - pillH / 2;
          const textX = anchor === "end" ? cxL - padX : anchor === "start" ? cxL + padX : cxL;
          return (
            <g
              key={nd.id}
              onMouseEnter={() => setHover(nd.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(nd.id)}
              style={{ cursor: "pointer", opacity: dim ? 0.18 : 1, transition: "opacity .15s" }}
            >
              <title>{nd.title}</title>
              <circle
                cx={nd.x} cy={nd.y} r={r}
                fill={nd.color}
                fillOpacity={isHover ? 1 : 0.9}
                stroke="#0b0b0f" strokeOpacity={0.35} strokeWidth={2}
                filter={isHover ? "url(#ig-glow)" : undefined}
              />
              {/* 乾淨的背景藥丸，不用 stroke halo（CJK 筆畫才不會糊） */}
              <rect
                x={pillX} y={pillY} width={pillW} height={pillH} rx={pillH / 2}
                fill="var(--bg-card, #18181b)"
                fillOpacity={0.92}
                stroke={isHover ? nd.color : "var(--border, #333)"}
                strokeOpacity={isHover ? 0.9 : 0.4}
                strokeWidth={isHover ? 1.5 : 1}
              />
              <text
                x={textX} y={cyL}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize={fs}
                fontWeight={isHover ? 800 : 600}
                className="fill-fg"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 圖例 */}
      {categoryColor.size > 0 && (
        <div className="flex flex-wrap gap-3 px-2 pt-1 text-xs">
          {Array.from(categoryColor.entries()).map(([cat, color]) => (
            <span key={cat} className="inline-flex items-center gap-1.5 text-fg-muted">
              <span className="w-3 h-3 rounded-full" style={{ background: color }} />
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
