"use client";

import { useEffect, useState } from "react";

/**
 * Thin fixed progress bar at the top of the viewport showing how far
 * the user has scrolled through the page. Use on long article pages.
 */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const handler = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
      setPct(Math.round(ratio * 1000) / 10);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
