"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor, ChevronDown, Check } from "lucide-react";

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
  const [palOpen, setPalOpen] = useState(false);
  const palRef = useRef<HTMLDivElement>(null);

  // 點外面 / 按 Esc 關閉色盤下拉
  useEffect(() => {
    if (!palOpen) return;
    const onDown = (e: MouseEvent) => {
      if (palRef.current && !palRef.current.contains(e.target as Node)) setPalOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPalOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [palOpen]);

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
      <div className="relative" ref={palRef}>
        <button
          type="button"
          onClick={() => setPalOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={palOpen}
          title="主題色盤"
          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full bg-bg-card border border-border text-sm text-fg-muted hover:text-fg transition"
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/25 shrink-0"
            style={{ background: (PALETTES.find((p) => p.key === palette) ?? PALETTES[0]).dot }}
          />
          <span>{(PALETTES.find((p) => p.key === palette) ?? PALETTES[0]).label}</span>
          <ChevronDown size={13} className={`transition-transform ${palOpen ? "rotate-180" : ""}`} />
        </button>
        {palOpen && (
          <ul
            role="listbox"
            aria-label="主題色盤"
            className="absolute right-0 z-50 mt-1 w-36 max-h-72 overflow-y-auto rounded-xl bg-bg-card border border-border shadow-lg py-1"
          >
            {PALETTES.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  role="option"
                  aria-selected={palette === p.key}
                  onClick={() => { setPal(p.key); setPalOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-bg-elevated transition ${palette === p.key ? "text-fg font-medium" : "text-fg-muted"}`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/25 shrink-0"
                    style={{ background: p.dot }}
                  />
                  <span className="flex-1">{p.label}</span>
                  {palette === p.key && <Check size={14} className="text-accent shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
