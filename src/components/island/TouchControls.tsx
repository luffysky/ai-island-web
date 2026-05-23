"use client";

import { useEffect, useRef, useState } from "react";
import { touchInteract, touchLook } from "./island-bus";

/**
 * 手機觸控：
 * - 移除虛擬搖桿（改 tap-to-move、在 IslandV0 內 Ground mesh 處理）
 * - 右側拖視角 LookPad
 * - 右下 E 互動鈕
 */
export function TouchControls() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
    setShow(isMobile);
  }, []);

  if (!show) return null;

  return (
    <>
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); touchInteract(); }}
        onClick={touchInteract}
        className="fixed right-6 bottom-10 w-16 h-16 rounded-full bg-yellow-400/95 text-black font-bold text-lg shadow-lg active:scale-90 active:bg-yellow-500"
        style={{ touchAction: "none", zIndex: 70 }}
        aria-label="互動"
      >
        E
      </button>
      <div className="fixed bottom-3 left-3 z-30 text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded pointer-events-none max-w-[calc(100vw-100px)]">
        👆 點地面走過去 · 右側拖視角 · E 互動
      </div>
      <LookPad />
    </>
  );
}

function LookPad() {
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="fixed select-none"
      style={{
        top: "15%",
        bottom: "30%",
        right: 0,
        width: "50vw",
        touchAction: "none",
        zIndex: 10,
        pointerEvents: "auto",
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) lastRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (!t || !lastRef.current) return;
        touchLook.dx += t.clientX - lastRef.current.x;
        touchLook.dy += t.clientY - lastRef.current.y;
        lastRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={() => { lastRef.current = null; }}
      onTouchCancel={() => { lastRef.current = null; }}
    />
  );
}
