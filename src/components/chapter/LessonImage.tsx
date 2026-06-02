"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

/**
 * 課程內圖片：縮圖點一下 → 全螢幕燈箱放大看（原畫質）。
 * 用在 LessonCard 的 markdown `img` renderer。Esc / 點背景 / X 都能關。
 */
export function LessonImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full my-3 cursor-zoom-in"
        aria-label={alt ? `放大圖片：${alt}` : "放大圖片"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="max-w-full h-auto rounded-lg border border-border transition group-hover:brightness-105"
        />
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition">
          <ZoomIn size={12} /> 點擊放大
        </span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
            aria-label="關閉"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ""}
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {alt && (
            <div className="absolute bottom-4 left-0 right-0 px-4 text-center text-sm text-white/70">
              {alt}
            </div>
          )}
        </div>
      )}
    </>
  );
}
