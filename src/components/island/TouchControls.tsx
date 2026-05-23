"use client";

import { useEffect, useRef, useState } from "react";
import { touchInput, touchInteract, touchLook } from "./island-bus";

/**
 * 手機版虛擬搖桿（左下半邊任處觸點 → joystick 出現） + 互動鈕 + 視角區
 * - mode: "semi" — 觸點哪 joystick spawn 哪、放手消失、直覺
 * - zone 涵蓋左下 50% × 50%、整個區域都可觸控
 * - z-index 70（最高層、確保不被 Canvas / 其他覆蓋）
 */
export function TouchControls() {
  const joyRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [debug, setDebug] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
    setShow(isMobile);
  }, []);

  useEffect(() => {
    if (!show || !joyRef.current) return;
    let cleanup: (() => void) | null = null;
    (async () => {
      try {
        const nipplejs = (await import("nipplejs")).default;
        const manager = nipplejs.create({
          zone: joyRef.current!,
          mode: "semi", // 觸點哪、joystick 從哪 spawn
          color: "rgba(255,255,255,0.8)",
          size: 100,
          fadeTime: 200,
          restJoystick: true,
          catchDistance: 200,
        });
        setDebug("joy ok");
        (manager as any).on("move", (_e: any, data: any) => {
          if (!data?.vector) return;
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
      } catch (e: any) {
        setDebug(`joy err: ${e?.message}`);
      }
    })();
    return () => { cleanup?.(); };
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* 左下虛擬搖桿區（半屏） */}
      <div
        ref={joyRef}
        className="fixed left-0 bottom-0 select-none"
        style={{
          width: "50vw",
          height: "50vh",
          touchAction: "none",
          zIndex: 70,
          pointerEvents: "auto",
        }}
      />
      {/* E 互動鈕 */}
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
      {/* 右側拖視角區（避開頂部 HUD 跟底部 E 鈕） */}
      <LookPad />
      {/* debug 訊息（之後可刪） */}
      {debug && (
        <div className="fixed top-3 left-3 z-[100] text-[10px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded pointer-events-none mt-28">
          {debug}
        </div>
      )}
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
