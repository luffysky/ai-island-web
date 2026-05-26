"use client";

import { useEffect, useState } from "react";

/**
 * 開發者 hook：取得當前 user 在某實驗的 variant。
 *
 * 用法：
 *   const variant = useAbVariant("pet-shape");
 *   if (variant === "B") return <NewPetUI />;
 *   return <OldPetUI />;
 *
 * 也提供 reportConversion(key, variant) — 達成目標時呼叫。
 */

const ANON_KEY = "ai_island_anon_id";

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = "anon_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function useAbVariant(experimentKey: string): string | null {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ab/assign", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: experimentKey, anonId: getAnonId() }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setVariant(j.variant ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [experimentKey]);

  return variant;
}

export async function reportAbConversion(experimentKey: string, variant: string, meta?: Record<string, unknown>) {
  try {
    await fetch("/api/ab/event", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: experimentKey,
        variant,
        event: "conversion",
        anonId: getAnonId(),
        meta,
      }),
    });
  } catch {
    // ignore
  }
}
