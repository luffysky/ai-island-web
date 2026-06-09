"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn } from "lucide-react";

/**
 * 課程內圖片：縮圖點一下 → 全螢幕燈箱放大看（原畫質）。
 * 用在 LessonCard 的 markdown `img` renderer。Esc / 點背景 / X 都能關。
 *
 * 深淺色雙版本：檔名含 `light` / `dark`（以 _ - . / 為界）就視為有雙版本，
 * 深色模式顯示 dark 版、淺色模式顯示 light 版。縮圖用 CSS 切換（無閃爍），
 * 燈箱用當前主題挑圖。例：foo_dark.png ↔ foo_light.png。
 */
const VARIANT_RE = /(^|[_\-./])(dark|light)(?=[_\-.]|$)/i;
function toVariant(src: string, to: "light" | "dark"): string {
  const from = to === "light" ? "dark" : "light";
  return src.replace(new RegExp(`(^|[_\\-./])${from}(?=[_\\-.]|$)`, "i"), (_m, p1) => p1 + to);
}

function useIsLight() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const read = () => setLight(document.documentElement.getAttribute("data-theme") === "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return light;
}

export function LessonImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  const [darkFb, setDarkFb] = useState(false);   // dark 變體載入失敗 → 退回 light
  const [lightFb, setLightFb] = useState(false); // light 變體載入失敗 → 退回 dark
  const [lbFb, setLbFb] = useState(false);       // 燈箱載入失敗 → 退回另一變體
  const isLight = useIsLight();

  // ── 燈箱內縮放 / 平移 ──
  const lbRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;

  const resetZoom = () => { setScale(1); setPos({ x: 0, y: 0 }); };

  // 以游標為中心縮放（factor>1 放大、<1 縮小）
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const el = lbRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      setPos((p) => {
        if (next <= MIN_SCALE) return { x: 0, y: 0 };
        const ratio = next / prev;
        return { x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio };
      });
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "+" || e.key === "=") zoomAt(innerWidth / 2, innerHeight / 2, 1.25);
      else if (e.key === "-" || e.key === "_") zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.25);
      else if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 滾輪縮放：用原生非被動監聽，才能 preventDefault 擋掉「Ctrl+滾輪 = 瀏覽器整頁縮放」
  useEffect(() => {
    if (!open) return;
    const el = lbRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  // 開關時重置縮放
  useEffect(() => { if (!open) resetZoom(); }, [open]);

  if (!src) return null;

  const hasVariant = VARIANT_RE.test(src);
  const isDarkSrc = /(^|[_\-./])dark(?=[_\-.]|$)/i.test(src);
  const darkSrc = isDarkSrc ? src : toVariant(src, "dark");
  const lightSrc = isDarkSrc ? toVariant(src, "light") : src;
  const lightboxSrc = hasVariant ? (isLight ? lightSrc : darkSrc) : src;

  const imgClass = "max-w-full h-auto rounded-lg border border-border transition group-hover:brightness-105";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full my-3 cursor-zoom-in"
        aria-label={alt ? `放大圖片：${alt}` : "放大圖片"}
      >
        {/* eslint-disable @next/next/no-img-element */}
        {hasVariant ? (
          <>
            <img
              src={darkFb ? lightSrc : darkSrc}
              onError={() => !darkFb && setDarkFb(true)}
              alt={alt ?? ""} loading="lazy" decoding="async" className={`lesson-img-dark ${imgClass}`}
            />
            <img
              src={lightFb ? darkSrc : lightSrc}
              onError={() => !lightFb && setLightFb(true)}
              alt={alt ?? ""} loading="lazy" decoding="async" className={`lesson-img-light ${imgClass}`}
            />
          </>
        ) : (
          <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className={imgClass} />
        )}
        {/* eslint-enable @next/next/no-img-element */}
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition">
          <ZoomIn size={12} /> 點擊放大
        </span>
      </button>

      {open && (
        <div
          ref={lbRef}
          onClick={() => { if (scale <= 1) setOpen(false); }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 overflow-hidden touch-none"
          style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-out" }}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white transition"
            aria-label="關閉"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lbFb ? (lightboxSrc === lightSrc ? darkSrc : lightSrc) : lightboxSrc}
            onError={() => !lbFb && setLbFb(true)}
            alt={alt ?? ""}
            draggable={false}
            className="max-w-full max-h-full object-contain rounded shadow-2xl select-none"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transition: dragging ? "none" : "transform 0.12s ease-out",
              willChange: "transform",
            }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (scale > 1) resetZoom();
              else zoomAt(e.clientX, e.clientY, 2.5);
            }}
            onPointerDown={(e) => {
              if (scale <= 1) return;
              e.stopPropagation();
              dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
              setDragging(true);
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d) return;
              setPos({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
            }}
            onPointerUp={() => { dragRef.current = null; setDragging(false); }}
            onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
          />
          <div className="absolute bottom-4 left-0 right-0 px-4 text-center text-sm text-white/70 pointer-events-none">
            {alt && <div>{alt}</div>}
            <div className="mt-1 text-xs text-white/45">滾輪縮放 · 拖曳移動 · 雙擊放大/還原 · Esc 關閉</div>
          </div>
        </div>
      )}
    </>
  );
}
