"use client";

import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// IG 風格圖片輪播：手機左右滑（scroll-snap）、桌面 hover 出箭頭、底部圓點。單張時就是一張圖、無多餘 UI。
export function ImageCarousel({ images, className = "", maxHeight = "max-h-[32rem]" }: { images: { url: string; alt?: string }[]; className?: string; maxHeight?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const n = images.length;

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIdx((prev) => (prev === i ? prev : Math.max(0, Math.min(n - 1, i))));
  }, [n]);

  const go = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(n - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  if (n === 0) return null;
  if (n === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={images[0].url} alt={images[0].alt ?? ""} loading="lazy" className={`w-full object-cover rounded-lg ${maxHeight} ${className}`} />
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className={`flex snap-x snap-mandatory rounded-lg no-scrollbar ${maxHeight}`}
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
      >
        {images.map((im, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={im.url} alt={im.alt ?? ""} loading="lazy" className={`w-full shrink-0 snap-center object-cover ${maxHeight}`} draggable={false} />
        ))}
      </div>

      {/* 計數（右上，IG 風） */}
      <div className="absolute top-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white pointer-events-none">
        {idx + 1}/{n}
      </div>

      {/* 桌面箭頭（hover 出現） */}
      {idx > 0 && (
        <button type="button" aria-label="上一張" onClick={() => go(idx - 1)}
          className="hidden md:grid place-items-center absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/70">
          <ChevronLeft size={18} />
        </button>
      )}
      {idx < n - 1 && (
        <button type="button" aria-label="下一張" onClick={() => go(idx + 1)}
          className="hidden md:grid place-items-center absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/70">
          <ChevronRight size={18} />
        </button>
      )}

      {/* 底部圓點 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none">
        {images.slice(0, 12).map((_, i) => (
          <span key={i} className={`rounded-full transition-all ${i === idx ? "w-1.5 h-1.5 bg-white" : "w-1 h-1 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}
