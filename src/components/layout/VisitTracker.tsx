"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 客戶端訪問追蹤、ping /api/notify-visit
 * - 每訪客每路徑每 5 分鐘最多一次（sessionStorage 鎖 client、server 也鎖）
 * - SPA 路由變動時也 ping
 */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const key = `visit:${pathname}`;
    try {
      const last = Number(sessionStorage.getItem(key) ?? "0");
      if (Date.now() - last < 5 * 60_000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {}
    // fire-and-forget
    fetch("/api/notify-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || "" }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
