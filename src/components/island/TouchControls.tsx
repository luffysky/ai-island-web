"use client";

import { useEffect, useRef, useState } from "react";
import { touchInput, touchInteract } from "./IslandV0";

/**
 * 手機版虛擬搖桿（左下） + 互動鈕（右下）。
 * 用 nipplejs。只在 (pointer:coarse) 或 < 768 顯示。
 */
export function TouchControls() {
  const joyRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
    setShow(isMobile);
  }, []);

  useEffect(() => {
    if (!show || !joyRef.current) return;
    let cleanup: (() => void) | null = null;
    (async () => {
      const nipplejs = (await import("nipplejs")).default;
      const manager = nipplejs.create({
        zone: joyRef.current!,
        mode: "static",
        position: { left: "60px", bottom: "60px" },
        color: "white",
        size: 110,
        restJoystick: true,
      });
      (manager as any).on("move", (_e: any, data: any) => {
        if (!data?.vector) return;
        // nipplejs y 朝上為正、我們的 y 也是「forward = +」
        touchInput.x = Math.max(-1, Math.min(1, data.vector.x));
        touchInput.y = Math.max(-1, Math.min(1, data.vector.y));
        touchInput.run = (data.force ?? 0) > 1.4;
      });
      (manager as any).on("end", () => {
        touchInput.x = 0;
        touchInput.y = 0;
        touchInput.run = false;
      });
      cleanup = () => manager.destroy();
    })();
    return () => { cleanup?.(); };
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div
        ref={joyRef}
        className="absolute left-0 bottom-0 w-40 h-40 z-30 touch-none select-none"
        style={{ touchAction: "none" }}
      />
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); touchInteract(); }}
        onClick={touchInteract}
        className="absolute right-6 bottom-10 z-30 w-16 h-16 rounded-full bg-yellow-400/90 text-black font-bold text-lg shadow-lg active:scale-90 active:bg-yellow-500"
        style={{ touchAction: "none" }}
      >
        E
      </button>
    </>
  );
}
