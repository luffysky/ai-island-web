"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Pos = { x: number; y: number };

/**
 * 讓一顆浮動按鈕（漢堡/大綱鈕）可以「拖曳移動」，位置記進 localStorage、下次沿用。
 *
 * 用法：把回傳的 `bind` 展開到 <button>、`style` 套到 style。
 * - 點一下（沒拖動）→ 觸發 `onTap`（原本的 onClick 行為）。
 * - 按住拖動 → 移動按鈕、放開時存位置；這次的 click 會被吞掉、不誤觸。
 * - 鍵盤 Enter/Space → 直接觸發 onTap（無障礙照顧）。
 *
 * 注意：按鈕要是 `position: fixed`（inline left/top 才有效）。若某斷點是 static，
 * 拖曳會被瀏覽器忽略（不會亂跑），可接受。
 */
export function useDraggableFab(storageKey: string, onTap: () => void) {
  const [pos, setPos] = useState<Pos | null>(null);
  const drag = useRef<{
    startX: number; startY: number; baseX: number; baseY: number; moved: boolean; id: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const size = useRef(44);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { const p = JSON.parse(raw); if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p); }
    } catch { /* ignore */ }
  }, [storageKey]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    size.current = Math.max(rect.width, rect.height, 40);
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false, id: e.pointerId };
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // 沒超過門檻＝還是點擊
    d.moved = true;
    const s = size.current;
    const nx = Math.min(Math.max(4, d.baseX + dx), window.innerWidth - s - 4);
    const ny = Math.min(Math.max(4, d.baseY + dy), window.innerHeight - s - 4);
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (d.moved) {
      suppressClick.current = true; // 吞掉這次拖曳結束後的 click
      setPos((p) => { if (p) { try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch { /* ignore */ } } return p; });
    }
  }, [storageKey]);

  const onClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); e.stopPropagation(); return; }
    onTap();
  }, [onTap]);

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto", touchAction: "none" }
    : { touchAction: "none" };

  return { bind: { onPointerDown, onPointerMove, onPointerUp, onClick }, style, positioned: pos != null };
}
