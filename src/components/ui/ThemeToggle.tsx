"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

/**
 * 暗黑 / 明亮 / 跟系統 三段切換 + 主題色盤（accent 換色）。
 * 用 localStorage 記憶 + 寫到 <html data-mode="..." data-palette="...">。
 * globals.css：[data-mode="light"] 覆寫亮暗 token；[data-palette] 只覆寫 accent 家族。
 */

type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "ai_island_theme";
const PALETTE_KEY = "ai_island_palette";

// 主題色盤：只換 accent（不動背景/文字，亮暗照舊）。key=null → 預設森綠、移除 data-palette。dot=暗底代表色。
const PALETTES: { key: string | null; label: string; dot: string }[] = [
  { key: null, label: "森", dot: "#50fa7b" },
  { key: "ocean", label: "海", dot: "#38bdf8" },
  { key: "sakura", label: "櫻", dot: "#fb7185" },
  { key: "lavender", label: "薰衣草", dot: "#a78bfa" },
  { key: "coral", label: "珊瑚", dot: "#fb923c" },
  { key: "mint", label: "薄荷", dot: "#34d399" },
];

function applyTheme(t: Theme) {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  const effective = t === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : t;
  html.setAttribute("data-mode", effective);
  // 同步 cookie，供 SSR 首屏就知道亮暗（layout 讀 ai_mode）→ 消除亮暗 FOUC
  document.cookie = `ai_mode=${effective}; path=/; max-age=31536000; samesite=lax`;
}

function effectiveTheme(t: Theme): "dark" | "light" {
  if (t !== "system") return t;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyPalette(key: string | null) {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  if (key) html.setAttribute("data-palette", key);
  else html.removeAttribute("data-palette");
}

export function ThemeToggle({ compact = false }: { compact?: boolean } = {}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [palette, setPalette] = useState<string | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    setTheme(saved);
    applyTheme(saved);
    const savedPal = localStorage.getItem(PALETTE_KEY);
    setPalette(savedPal);
    applyPalette(savedPal);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const set = (t: Theme) => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  };

  const setPal = (key: string | null) => {
    setPalette(key);
    if (key) localStorage.setItem(PALETTE_KEY, key);
    else localStorage.removeItem(PALETTE_KEY);
    applyPalette(key);
  };

  // compact：單顆 on/off 鈕、在深↔淺之間切換（手機 nav 用、省空間；色盤在完整版切）
  if (compact) {
    const eff = effectiveTheme(theme);
    const isLight = eff === "light";
    return (
      <button
        onClick={() => set(isLight ? "dark" : "light")}
        className="p-2 rounded-full bg-bg-card border border-border text-fg-muted hover:text-fg"
        title={isLight ? "切到暗黑" : "切到明亮"}
        aria-label={isLight ? "切換到暗黑模式" : "切換到明亮模式"}
      >
        {isLight ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-bg-card border border-border" role="group" aria-label="亮暗切換">
        <button
          onClick={() => set("dark")}
          className={`p-1.5 rounded-full ${theme === "dark" ? "bg-accent text-accent-contrast" : "text-fg-muted hover:text-fg"}`}
          title="暗黑"
          aria-label="暗黑模式"
        >
          <Moon size={13} />
        </button>
        <button
          onClick={() => set("system")}
          className={`p-1.5 rounded-full ${theme === "system" ? "bg-accent text-accent-contrast" : "text-fg-muted hover:text-fg"}`}
          title="跟系統"
          aria-label="跟系統模式"
        >
          <Monitor size={13} />
        </button>
        <button
          onClick={() => set("light")}
          className={`p-1.5 rounded-full ${theme === "light" ? "bg-accent text-accent-contrast" : "text-fg-muted hover:text-fg"}`}
          title="明亮"
          aria-label="明亮模式"
        >
          <Sun size={13} />
        </button>
      </div>
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-bg-card border border-border" role="group" aria-label="主題色盤">
        {PALETTES.map((p) => (
          <button
            key={p.label}
            onClick={() => setPal(p.key)}
            title={`色盤：${p.label}`}
            aria-label={`主題色盤 ${p.label}`}
            aria-pressed={palette === p.key}
            className={`w-4 h-4 rounded-full transition ${palette === p.key ? "ring-2 ring-fg ring-offset-1 ring-offset-bg-card" : "border border-black/20 dark:border-white/25 hover:scale-110"}`}
            style={{ background: p.dot }}
          />
        ))}
      </div>
    </div>
  );
}
