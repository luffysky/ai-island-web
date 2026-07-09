"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STORAGE_KEY = "admin-sidebar-collapsed";

/**
 * 後台側欄收合容器。children 來自 server component（NavGroup / AdminLink）、
 * 收合時把 nav 整塊隱藏、只留切回展開的按鈕。
 */
export function CollapsibleAside({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={`shrink-0 transition-[width] duration-300 ease-in-out ${
        // 手機收合時 w-0（不佔左邊空間）；桌機保留 w-12 細軌
        collapsed ? "w-0 md:w-12" : "w-44 md:w-52"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "展開側欄" : "收合側欄"}
        className={
          collapsed
            ? // 收合：手機浮動一顆小圓鈕(不佔位)、桌機留在細軌內
              "fixed left-1 top-24 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-bg-card border border-border shadow-md text-fg-muted hover:text-accent hover:scale-105 active:scale-95 transition md:static md:top-auto md:left-auto md:w-full md:h-auto md:rounded md:border-0 md:bg-transparent md:shadow-none md:mb-3 md:p-1.5 md:justify-end"
            : "w-full flex items-center justify-end mb-3 p-1.5 text-fg-muted hover:text-accent transition"
        }
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={16} />}
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? "opacity-0 max-h-0 overflow-hidden pointer-events-none" : "opacity-100 max-h-[4000px]"
        }`}
      >
        {children}
      </div>
    </aside>
  );
}
