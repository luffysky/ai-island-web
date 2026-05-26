"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * P4-16：Web Vitals 上報。
 * mount 在 root layout、自動 listen 並 beacon POST /api/analytics/web-vitals。
 * fail-soft：endpoint 失敗不阻斷 UX。
 */
export function WebVitalsReporter() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    let cancelled = false;
    import("web-vitals").then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      if (cancelled) return;
      const send = (metric: any) => {
        try {
          const body = JSON.stringify({
            metric: metric.name,
            value: metric.value,
            rating: metric.rating,
            page_path: pathname,
            navigation_type: metric.navigationType ?? null,
            device_type: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
          });
          if (navigator.sendBeacon) {
            navigator.sendBeacon("/api/analytics/web-vitals", new Blob([body], { type: "application/json" }));
          } else {
            fetch("/api/analytics/web-vitals", {
      credentials: "include",
              method: "POST",
              body,
              headers: { "Content-Type": "application/json" },
              keepalive: true,
            }).catch(() => {});
          }
        } catch {
          // ignore
        }
      };
      onLCP(send);
      onINP(send);
      onCLS(send);
      onFCP(send);
      onTTFB(send);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
