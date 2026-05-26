"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPreciseLocation } from "@/lib/geo-precise";

function id(prefix: string) {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value}`;
}

function getVisitorId() {
  const key = "aii_visitor_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = id("visitor");
  localStorage.setItem(key, next);
  return next;
}

function getSessionId() {
  const key = "aii_session_id";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const next = id("session");
  sessionStorage.setItem(key, next);
  return next;
}

function maxScrollPct() {
  const doc = document.documentElement;
  const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / (scrollable + window.innerHeight)) * 100));
}

export function InteractionTracker() {
  return (
    <Suspense fallback={null}>
      <InteractionTrackerInner />
    </Suspense>
  );
}

function InteractionTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageViewId = useRef<string>("");
  const startedAt = useRef<number>(Date.now());
  const maxScroll = useRef<number>(0);
  const districtRef = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname || "/";
    const sessionId = getSessionId();
    const visitorId = getVisitorId();
    pageViewId.current = id("page");
    startedAt.current = Date.now();
    maxScroll.current = maxScrollPct();

    // 精準位置：opt-in 才查、結果 session 內共用
    getPreciseLocation()
      .then((geo) => {
        if (geo?.district) districtRef.current = geo.district;
      })
      .catch(() => {});

    const payload = (eventType: string, exitReason?: string) => {
      const durationSec = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
      maxScroll.current = Math.max(maxScroll.current, maxScrollPct());
      return {
        eventType,
        sessionId,
        visitorId,
        pageViewId: pageViewId.current,
        path,
        title: document.title,
        referrer: document.referrer || null,
        durationSec,
        scrollMaxPct: maxScroll.current,
        readComplete: maxScroll.current >= 90,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        district: districtRef.current,
        exitReason,
      };
    };

    const send = (eventType: string, exitReason?: string, beacon = false) => {
      const body = JSON.stringify(payload(eventType, exitReason));
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
        return;
      }
      fetch("/api/analytics/track", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: beacon,
      }).catch(() => {});
    };

    send("page_view");

    const heartbeat = window.setInterval(() => send("heartbeat"), 15_000);
    const onScroll = () => {
      maxScroll.current = Math.max(maxScroll.current, maxScrollPct());
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") send("page_exit", "hidden", true);
    };
    const onBeforeUnload = () => send("page_exit", "unload", true);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      send("page_exit", "route_change", true);
      window.clearInterval(heartbeat);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [pathname, searchParams]);

  return null;
}
