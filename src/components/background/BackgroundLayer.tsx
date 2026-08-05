"use client";

import { useEffect, useState } from "react";
import { ProceduralScene } from "./ProceduralScene";
import { sceneById, type BackgroundSpec } from "@/lib/background/scenes";

/**
 * 全站唯一的固定背景層：position:fixed、inset:0、z-index:-10、pointer-events:none，
 * 墊在所有頁面內容的最底層。卡片自帶不透明 bg-bg-card → 內容照樣可讀；只有頁面
 * 間隙 / 卡片之間會透出背景（需要 globals.css 的 html[data-bg-active] body 透明規則）。
 *
 * 即時更新：監聽 window 的 "ai-bg-change"（detail = BackgroundSpec），選擇器套用時
 * 不用 reload 即可換背景。掛載時也重讀一次 ai_bg cookie（可能比 SSR 傳來的 initial 新）。
 */

function readCookieSpec(): BackgroundSpec | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/(?:^|;\s*)ai_bg=([^;]*)/);
  if (!m) return undefined;
  try {
    const raw = decodeURIComponent(m[1]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BackgroundSpec;
    return parsed;
  } catch {
    return undefined;
  }
}

function syncBgActiveAttr(spec: BackgroundSpec) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (spec) root.setAttribute("data-bg-active", "");
  else root.removeAttribute("data-bg-active");
}

export function BackgroundLayer({ initial }: { initial: BackgroundSpec }) {
  const [spec, setSpec] = useState<BackgroundSpec>(initial);

  // 掛載：套 data-bg-active（依 initial）+ 重讀 cookie（可能更新）。
  useEffect(() => {
    syncBgActiveAttr(initial);
    const fromCookie = readCookieSpec();
    if (fromCookie !== undefined) {
      setSpec(fromCookie);
      syncBgActiveAttr(fromCookie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 即時更新：選擇器 dispatch("ai-bg-change", { detail: spec })。
  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<BackgroundSpec>).detail ?? null;
      setSpec(detail);
      syncBgActiveAttr(detail);
    }
    window.addEventListener("ai-bg-change", onChange as EventListener);
    return () => window.removeEventListener("ai-bg-change", onChange as EventListener);
  }, []);

  if (!spec) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -10,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {spec.type === "procedural" ? (
        <ProceduralScene scene={sceneById(spec.proceduralId)} density={spec.density ?? 1} />
      ) : spec.type === "gradient" && spec.gradientCss ? (
        <div style={{ position: "absolute", inset: 0, background: spec.gradientCss }} />
      ) : null}

      {spec.overlayColor && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: spec.overlayColor,
            opacity: spec.overlayOpacity ?? 0.3,
          }}
        />
      )}
    </div>
  );
}
