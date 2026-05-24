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
      className={`shrink-0 transition-all duration-200 ${
        collapsed ? "w-12" : "w-52"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "展開側欄" : "收合側欄"}
        className="w-full flex items-center justify-end mb-3 p-1.5 text-fg-muted hover:text-accent transition"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <div className={collapsed ? "hidden" : "block"}>{children}</div>
    </aside>
  );
}
