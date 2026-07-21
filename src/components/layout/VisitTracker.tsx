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
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || "" }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  // 離開通知：記錄進入時間，離開/切走路徑時用 sendBeacon 回報停留時長（配 /api/notify-leave）
  useEffect(() => {
    if (!pathname) return;
    const enter = Date.now();
    const fire = () => {
      const durationMs = Date.now() - enter;
      if (durationMs < 5000) return; // 太短不報（與 server 端一致）
      try {
        const body = JSON.stringify({ path: pathname, durationMs });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/notify-leave", new Blob([body], { type: "application/json" }));
        } else {
          fetch("/api/notify-leave", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "include" }).catch(() => {});
        }
      } catch {}
    };
    const onHide = () => { if (document.visibilityState === "hidden") fire(); };
    window.addEventListener("pagehide", fire);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", fire);
      document.removeEventListener("visibilitychange", onHide);
      fire(); // SPA 路徑切換時也回報上一頁停留
    };
  }, [pathname]);

  return null;
}
