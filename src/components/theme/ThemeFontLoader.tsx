"use client";

/**
 * 全站字體載入器（掛在 root layout 的 <body>）。
 *
 * 掛載時：讀 `ai_theme` cookie（目前套用的主題定義）→ 解析 →
 * fetch `/api/fonts` 目錄 → loadThemeFonts 把字體注入頁面並設 `--font-*` 變數。
 * 沒有 cookie / 沒有字體 → 什麼都不做（回退系統字）。
 */

import { useEffect } from "react";
import { loadThemeFonts, type FontCatalog } from "@/lib/theme/font-loader";
import type { ThemeDefinition } from "@/lib/theme/engine";

function readThemeCookie(): ThemeDefinition | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("ai_theme="));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.slice("ai_theme=".length));
    const def = JSON.parse(raw) as ThemeDefinition;
    if (def && def.typography) return def;
    return null;
  } catch {
    return null;
  }
}

export function ThemeFontLoader() {
  useEffect(() => {
    const def = readThemeCookie();
    if (!def) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fonts", { cache: "force-cache" });
        if (!res.ok) return;
        const catalog = (await res.json()) as FontCatalog;
        if (cancelled || !catalog?.fonts?.length) return;
        loadThemeFonts(def, catalog);
      } catch {
        /* 靜默：字體載入失敗不影響版面（系統字 fallback） */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
