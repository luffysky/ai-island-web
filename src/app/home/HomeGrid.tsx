"use client";
// 個人首頁編輯器：拖拉/縮放 widget（desktop/tablet 格線）、加入/移除、樂觀更新存 DB。
// 手機＝依 mobile.order 單欄堆疊（唯讀，不拖拉）。引擎數學全走 @/lib/widgets/grid。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Check, Plus, GripVertical, Trash2 } from "lucide-react";
import {
  GRID, breakpointForWidth, pixelSize, resolveCollisions, compactLayout,
  deriveTabletFromDesktop, deriveMobileFromDesktop, layoutHeight,
  type Breakpoint, type GridItem,
} from "@/lib/widgets/grid";
import type { WidgetInstance } from "@/lib/widgets/types";
import { WidgetRenderer } from "@/components/widgets/registry";

type Catalog = { id: string; name: string; category: string; description: string }[];
type Props = { userId: string; layout: { id: string; name: string } | null; initialInstances: WidgetInstance[]; catalog: Catalog };

const posOf = (inst: WidgetInstance, bp: Exclude<Breakpoint, "mobile">) =>
  (inst.position?.[bp] as { x: number; y: number; w: number; h: number }) ?? { x: 0, y: 0, w: 2, h: 2 };

export function HomeGrid({ userId, layout, initialInstances, catalog }: Props) {
  const [items, setItems] = useState<WidgetInstance[]>(initialInstances);
  const [editing, setEditing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bp, setBp] = useState<Breakpoint>("desktop");
  const [containerW, setContainerW] = useState(1200);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; mode: "move" | "resize"; startX: number; startY: number; orig: GridItem } | null>(null);

  // 量測寬度 + 斷點
  useEffect(() => {
    const measure = () => {
      const w = ref.current?.clientWidth ?? window.innerWidth;
      setContainerW(w);
      setBp(breakpointForWidth(window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const gridBp: Exclude<Breakpoint, "mobile"> = bp === "mobile" ? "desktop" : bp;
  const cfg = GRID[gridBp];
  const colStep = (containerW - cfg.gap * (cfg.columns - 1)) / cfg.columns + cfg.gap;
  const rowStep = cfg.rowHeight + cfg.gap;

  // desktop/tablet 的 GridItem 陣列（畫面用）
  const gridItems: GridItem[] = useMemo(
    () => items.filter((i) => !i.hidden).map((i) => ({ id: i.id, ...posOf(i, gridBp), locked: i.locked })),
    [items, gridBp],
  );
  const totalRows = layoutHeight(gridItems);

  // 存位置（desktop 為主、重算 tablet/mobile）
  const savePositions = useCallback(async (next: WidgetInstance[]) => {
    if (!layout) return;
    const desktop: GridItem[] = next.filter((i) => !i.hidden).map((i) => ({ id: i.id, ...posOf(i, "desktop") }));
    const tablet = deriveTabletFromDesktop(desktop);
    const mobile = deriveMobileFromDesktop(desktop);
    const tById = new Map(tablet.map((t) => [t.id, t]));
    const mById = new Map(mobile.map((m) => [m.id, m]));
    const payload = next.filter((i) => !i.hidden).map((i) => {
      const d = posOf(i, "desktop"); const t = tById.get(i.id)!;
      return { id: i.id, widget_type: i.widget_type, position: { desktop: d, tablet: { x: t.x, y: t.y, w: t.w, h: t.h }, mobile: { order: mById.get(i.id)?.order ?? 0 } } };
    });
    try { await fetch(`/api/layouts/${layout.id}/widgets/bulk`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: payload }) }); } catch { /* 靜默、下次存再補 */ }
  }, [layout]);

  // 套用一次「移動/縮放」到 items（改 gridBp 這個斷點的 position）
  const applyGrid = (next: GridItem[]) => {
    setItems((prev) => prev.map((it) => {
      const g = next.find((n) => n.id === it.id);
      if (!g) return it;
      return { ...it, position: { ...it.position, [gridBp]: { x: g.x, y: g.y, w: g.w, h: g.h } } };
    }));
  };

  const onPointerDown = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
    if (!editing || bp === "mobile") return;
    const it = gridItems.find((g) => g.id === id);
    if (!it || it.locked) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id, mode, startX: e.clientX, startY: e.clientY, orig: { ...it } };
  };

  useEffect(() => {
    if (!editing) return;
    const onMove = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dCol = Math.round((e.clientX - d.startX) / colStep);
      const dRow = Math.round((e.clientY - d.startY) / rowStep);
      const base = gridItems.map((g) => ({ ...g }));
      const target = base.find((g) => g.id === d.id)!;
      if (d.mode === "move") {
        target.x = Math.max(0, Math.min(cfg.columns - target.w, d.orig.x + dCol));
        target.y = Math.max(0, d.orig.y + dRow);
      } else {
        target.w = Math.max(1, Math.min(cfg.columns - target.x, d.orig.w + dCol));
        target.h = Math.max(1, d.orig.h + dRow);
      }
      const resolved = resolveCollisions(base, d.id);
      if (resolved) applyGrid(resolved);
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      setItems((prev) => {
        const compact = compactLayout(prev.filter((i) => !i.hidden).map((i) => ({ id: i.id, ...posOf(i, gridBp), locked: i.locked })));
        const next = prev.map((it) => {
          const g = compact.find((n) => n.id === it.id);
          return g ? { ...it, position: { ...it.position, [gridBp]: { x: g.x, y: g.y, w: g.w, h: g.h } } } : it;
        });
        void savePositions(next);
        return next;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [editing, gridItems, cfg.columns, colStep, rowStep, gridBp, savePositions]);

  const addWidget = async (type: string) => {
    if (!layout) return;
    try {
      const r = await fetch(`/api/layouts/${layout.id}/widgets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widget_type: type }) });
      const j = await r.json();
      if (j.widget) setItems((p) => [...p, j.widget]);
    } catch { /* ignore */ }
    setPaletteOpen(false);
  };
  const removeWidget = async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    try { await fetch(`/api/widgets/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold">🏠 我的首頁</h1>
        <div className="flex items-center gap-2">
          {editing && (
            <button onClick={() => setPaletteOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-accent/50 text-accent hover:bg-accent/10"><Plus size={15} /> 加入 widget</button>
          )}
          <button onClick={() => setEditing((e) => !e)} className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${editing ? "bg-accent text-black" : "border border-border hover:border-accent"}`}>
            {editing ? <><Check size={15} /> 完成</> : <><Pencil size={15} /> 編輯版面</>}
          </button>
        </div>
      </div>

      {editing && paletteOpen && (
        <div className="mb-4 rounded-2xl border border-border bg-bg-card p-3">
          <div className="text-xs text-fg-muted mb-2">選一個加到版面（會排到最底）</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {catalog.map((w) => (
              <button key={w.id} onClick={() => addWidget(w.id)} className="text-left rounded-xl border border-border hover:border-accent p-2.5 transition">
                <div className="text-sm font-medium">{w.name}</div>
                <div className="text-[11px] text-fg-muted line-clamp-2">{w.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {bp === "mobile" ? (
        // 手機：單欄依 order 堆疊（唯讀）
        <div className="flex flex-col gap-3">
          {[...items].filter((i) => !i.hidden).sort((a, b) => ((a.position?.mobile as any)?.order ?? 0) - ((b.position?.mobile as any)?.order ?? 0)).map((it) => (
            <div key={it.id} style={{ minHeight: (posOf(it, "desktop").h) * 60 }}>
              <WidgetRenderer instance={it} userId={userId} />
            </div>
          ))}
        </div>
      ) : (
        <div ref={ref} className="relative" style={{ height: totalRows * rowStep - cfg.gap }}>
          {items.filter((i) => !i.hidden).map((it) => {
            const p = posOf(it, gridBp);
            const size = pixelSize({ w: p.w, h: p.h }, containerW, cfg);
            return (
              <div key={it.id} className="absolute" style={{ left: p.x * colStep, top: p.y * rowStep, width: size.width, height: size.height, transition: drag.current?.id === it.id ? "none" : "left .15s, top .15s, width .15s, height .15s" }}>
                <div className="relative h-full">
                  <WidgetRenderer instance={it} userId={userId} editing={editing} onDisable={() => removeWidget(it.id)} />
                  {editing && !it.locked && (
                    <>
                      <div onPointerDown={(e) => onPointerDown(e, it.id, "move")} className="absolute top-1 left-1 z-10 w-7 h-7 grid place-items-center rounded-lg bg-black/50 text-white cursor-grab active:cursor-grabbing touch-none" title="拖拉移動"><GripVertical size={14} /></div>
                      <button onClick={() => removeWidget(it.id)} className="absolute top-1 right-1 z-10 w-7 h-7 grid place-items-center rounded-lg bg-black/50 text-white hover:bg-rose-600" title="移除"><Trash2 size={13} /></button>
                      <div onPointerDown={(e) => onPointerDown(e, it.id, "resize")} className="absolute bottom-0 right-0 z-10 w-5 h-5 cursor-nwse-resize touch-none" title="縮放"><div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r-2 border-b-2 border-black/50 dark:border-white/60" /></div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {items.filter((i) => !i.hidden).length === 0 && (
            <div className="text-center text-sm text-fg-muted py-16">還沒有 widget。按「編輯版面 → 加入 widget」開始擺你的首頁。</div>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-fg-muted mt-6">
        個人儀表板 · 跨裝置同步 · 想看每日情報去 <Link href={"/daily" as any} className="text-accent hover:underline">/daily</Link>
      </p>
    </main>
  );
}
