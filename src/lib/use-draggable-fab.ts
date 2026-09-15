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
 *
 * `minTop`（預設 64）：上緣不得低於此 y（＝不進頂部導覽列 TopNav sticky top-0 h-14=56px）。
 * 否則拖到頂會鑽進導覽列底下被蓋住、點不到也拖不回來（見 bug 258）。
 */
export function useDraggableFab(storageKey: string, onTap: () => void, minTop = 64) {
  const [pos, setPos] = useState<Pos | null>(null);
  const drag = useRef<{
    startX: number; startY: number; baseX: number; baseY: number; moved: boolean; id: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const size = useRef(44);

  const clampPos = useCallback((p: Pos): Pos => {
    if (typeof window === "undefined") return p;
    const s = size.current;
    return {
      x: Math.min(Math.max(4, p.x), Math.max(4, window.innerWidth - s - 4)),
      y: Math.min(Math.max(minTop, p.y), Math.max(minTop, window.innerHeight - s - 4)),
    };
  }, [minTop]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          // clamp 回可視範圍（含上緣不進導覽列）→ 舊的壞位置(卡在導覽列底下)會在下次載入自動歸位、重整即自癒
          const c = clampPos(p);
          setPos(c);
          if (c.x !== p.x || c.y !== p.y) { try { localStorage.setItem(storageKey, JSON.stringify(c)); } catch { /* ignore */ } }
        }
      }
    } catch { /* ignore */ }
  }, [storageKey, clampPos]);

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
    // 拖曳時就 clamp（含上緣不進導覽列）→ 鈕停在導覽列下緣、不會滑進去被蓋住
    setPos(clampPos({ x: d.baseX + dx, y: d.baseY + dy }));
  }, [clampPos]);

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
