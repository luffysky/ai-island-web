"use client";

import { useMemo, useState } from "react";

type Frag = { id: string; title: string; tags: string[]; category: string | null };

const PALETTE = ["#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#ef4444", "#3b82f6", "#eab308"];

/**
 * 碎片關聯圖：node = 碎片，edge = 兩碎片有共同標籤（線越粗 = 共用越多）。
 * 圓形佈局、純 SVG、無外部依賴。hover 高亮相連碎片。
 */
export function RelationshipGraph({ fragments, onSelect }: { fragments: Frag[]; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges, categoryColor } = useMemo(() => {
    const W = 720, H = 560, cx = W / 2, cy = H / 2;
    const R = Math.min(cx, cy) - 70;
    const n = fragments.length;

    const cats = Array.from(new Set(fragments.map((f) => f.category).filter(Boolean))) as string[];
    const categoryColor = new Map<string, string>();
    cats.forEach((c, i) => categoryColor.set(c, PALETTE[i % PALETTE.length]));

    const nodes = fragments.map((f, i) => {
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        ...f,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        color: f.category ? categoryColor.get(f.category)! : "#6b7280",
        degree: 0,
      };
    });

    const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
    const edges: { a: string; b: string; ax: number; ay: number; bx: number; by: number; shared: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = (nodes[i].tags ?? []).filter((t) => (nodes[j].tags ?? []).includes(t)).length;
        if (shared > 0) {
          edges.push({
            a: nodes[i].id, b: nodes[j].id,
            ax: nodes[i].x, ay: nodes[i].y, bx: nodes[j].x, by: nodes[j].y, shared,
          });
          nodes[i].degree += shared;
          nodes[j].degree += shared;
        }
      }
    }
    return { nodes, edges, categoryColor, W, H };
  }, [fragments]);

  if (fragments.length < 2) {
    return <div className="text-center text-fg-muted text-sm py-12">至少要 2 個碎片才畫得出關聯圖。</div>;
  }

  const connected = (id: string) =>
    hover === id || edges.some((e) => (e.a === hover && e.b === id) || (e.b === hover && e.a === id));

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-3">
      <div className="text-xs text-fg-muted mb-1 px-2">
        {edges.length} 條關聯（共同標籤）· 滑過碎片看它連到誰 · 點碎片可定位
      </div>
      <svg viewBox="0 0 720 560" className="w-full h-auto select-none">
        {/* edges */}
        {edges.map((e, i) => {
          const active = !hover || e.a === hover || e.b === hover;
          return (
            <line
              key={i}
              x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}
              stroke={active ? "var(--accent, #f59e0b)" : "#3f3f46"}
              strokeOpacity={active ? Math.min(0.2 + e.shared * 0.25, 0.9) : 0.06}
              strokeWidth={active ? Math.min(1 + e.shared, 4) : 0.6}
            />
          );
        })}
        {/* nodes */}
        {nodes.map((nd) => {
          const r = 7 + Math.min(nd.degree * 1.6, 14);
          const dim = hover && !connected(nd.id);
          return (
            <g
              key={nd.id}
              transform={`translate(${nd.x},${nd.y})`}
              onMouseEnter={() => setHover(nd.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(nd.id)}
              style={{ cursor: "pointer", opacity: dim ? 0.25 : 1 }}
            >
              <circle r={r} fill={nd.color} fillOpacity={0.85} stroke="#000" strokeOpacity={0.3} />
              <text
                y={-r - 5}
                textAnchor="middle"
                fontSize={hover === nd.id ? 13 : 11}
                fontWeight={hover === nd.id ? 700 : 500}
                fill="currentColor"
                className="fill-fg"
              >
                {nd.title.length > 12 ? nd.title.slice(0, 12) + "…" : nd.title}
              </text>
            </g>
          );
        })}
      </svg>
      {/* 圖例 */}
      {categoryColor.size > 0 && (
        <div className="flex flex-wrap gap-2 px-2 pt-1 text-[11px]">
          {Array.from(categoryColor.entries()).map(([cat, color]) => (
            <span key={cat} className="inline-flex items-center gap-1 text-fg-muted">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
