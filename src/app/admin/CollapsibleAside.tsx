"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDraggableFab } from "@/lib/use-draggable-fab";

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

  // 收合後的浮動小圓鈕：可拖曳移動（手機不擋內容）。位置記 localStorage。
  const fab = useDraggableFab("admin-sidebar-fab-pos", toggle);

  return (
    <aside
      className={`shrink-0 self-start sticky top-4 max-h-[calc(100vh-1.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain admin-aside-scroll transition-[width] duration-300 ease-in-out ${
        // 側欄獨立滾動：sticky+self-start 讓它捲動內容時「不跟著動」、超長才自己內捲。
        // 手機收合時 w-0（不佔左邊空間）；桌機保留 w-12 細軌。overflow-x-hidden + 固定寬內容 = 往左右滑開
        collapsed ? "w-0 md:w-12" : "w-44 md:w-52"
      }`}
    >
      {collapsed ? (
        // 收合：手機浮動一顆小圓鈕(不佔位、可拖曳移動)、桌機留在細軌內
        <button
          type="button"
          {...fab.bind}
          style={fab.style}
          aria-label="展開側欄（可拖曳移動）"
          className="fixed left-1 top-24 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-bg-card border border-border shadow-md text-fg-muted hover:text-accent hover:scale-105 active:scale-95 transition cursor-grab active:cursor-grabbing md:static md:top-auto md:left-auto md:w-full md:h-auto md:rounded md:border-0 md:bg-transparent md:shadow-none md:mb-3 md:p-1.5 md:justify-end"
        >
          <ChevronRight size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label="收合側欄"
          className="w-full flex items-center justify-end mb-3 p-1.5 text-fg-muted hover:text-accent transition"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {/* 固定寬內容：被 aside 的寬度動畫裁切 → 視覺上往左收 / 往右展開（不淡出） */}
      <div className={`w-44 md:w-52 ${collapsed ? "pointer-events-none" : ""}`}>{children}</div>
    </aside>
  );
}
