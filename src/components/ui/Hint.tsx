"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

/**
 * 名詞解釋浮泡 — 給後台用、讓不懂程式的管理員看得懂
 *
 * 用法：
 *   <Hint title="webhook">
 *     LINE 平台「收到訊息」時、會自動通知我們的網站、這個通知接收點叫 webhook。
 *   </Hint>
 *
 * 點擊（mobile）或 hover（desktop）顯示。
 */
export function Hint({
  title,
  children,
  size = 12,
}: {
  title?: string;
  children: React.ReactNode;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center align-middle ml-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-fg-muted hover:text-accent transition inline-flex items-center"
        aria-label="名詞解釋"
      >
        <HelpCircle size={size} />
      </button>
      {open && (
        <span
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-64 bg-bg-card border border-accent/40 rounded-lg shadow-2xl p-3 text-xs text-fg font-normal normal-case tracking-normal leading-relaxed"
          style={{ minWidth: "min(16rem, calc(100vw - 2rem))" }}
        >
          {title && <div className="font-bold text-accent mb-1">{title}</div>}
          <div>{children}</div>
        </span>
      )}
    </span>
  );
}
