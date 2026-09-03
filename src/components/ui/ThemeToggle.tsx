"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor, ChevronDown, Check } from "lucide-react";
import { SITE_MODE_STORAGE_KEY, setSiteMode } from "@/lib/theme/apply";

/**
 * 暗黑 / 明亮 / 跟系統 三段切換 + 主題色盤（accent 換色）。
 * 用 localStorage 記憶 + 寫到 <html data-mode="..." data-palette="...">。
 * globals.css：[data-mode="light"] 覆寫亮暗 token；[data-palette] 只覆寫 accent 家族。
 */

type Theme = "dark" | "light" | "system";

const STORAGE_KEY = SITE_MODE_STORAGE_KEY; // 與 Theme Studio 共用同一個 key
const PALETTE_KEY = "ai_island_palette";
const MENU_OPACITY_KEY = "ai_menu_opacity"; // 選單/下拉/側欄表面不透明度（0.5 全玻璃 → 1 實色）
const MENU_OPACITY_DEFAULT = 0.82;

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
  const effective = t === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : t;
  // data-mode + ai_mode cookie（SSR 首屏不閃）+ localStorage —— 共用 setSiteMode，
  // 免得 Theme Studio 那邊各寫各的、兩邊對不起來。
  // store:false —— 這裡的 localStorage 是三段（dark/light/system），由下面的 set() 自己寫。
  setSiteMode(effective, { store: false });
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

// 選單表面不透明度：套在 :root 的 --menu-opacity（.menu-surface 讀它）。玻璃仍帶 backdrop-blur。
function applyMenuOpacity(v: number) {
  if (typeof window === "undefined") return;
  document.documentElement.style.setProperty("--menu-opacity", String(v));
}

export function ThemeToggle({ compact = false, menu = false }: { compact?: boolean; menu?: boolean } = {}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [palette, setPalette] = useState<string | null>(null);
  const [palOpen, setPalOpen] = useState(false);
  const [menuOpacity, setMenuOpacity] = useState(MENU_OPACITY_DEFAULT);
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
    const rawOpacity = Number(localStorage.getItem(MENU_OPACITY_KEY));
    const savedOpacity = Number.isFinite(rawOpacity) && rawOpacity > 0 ? rawOpacity : MENU_OPACITY_DEFAULT;
    setMenuOpacity(savedOpacity);
    applyMenuOpacity(savedOpacity);
  }, []);

  const setMenuOp = (v: number) => {
    setMenuOpacity(v);
    localStorage.setItem(MENU_OPACITY_KEY, String(v));
    applyMenuOpacity(v);
  };

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

  // menu：下拉選單內的外觀區塊（手機版把主題/色盤/選單材質收進頭像下拉）。
  if (menu) {
    return (
      <div className="px-4 py-3 space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">外觀</div>

        {/* 亮暗模式 */}
        <div>
          <div className="mb-1 text-xs text-fg-muted">模式</div>
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-bg-elevated border border-border" role="group" aria-label="亮暗切換">
            <button onClick={() => set("dark")} className={`px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 ${theme === "dark" ? "bg-accent text-accent-contrast" : "text-fg-muted"}`}><Moon size={12} /> 暗</button>
            <button onClick={() => set("system")} className={`px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 ${theme === "system" ? "bg-accent text-accent-contrast" : "text-fg-muted"}`}><Monitor size={12} /> 系統</button>
            <button onClick={() => set("light")} className={`px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 ${theme === "light" ? "bg-accent text-accent-contrast" : "text-fg-muted"}`}><Sun size={12} /> 亮</button>
          </div>
        </div>

        {/* 主題色盤 */}
        <div>
          <div className="mb-1 text-xs text-fg-muted">色盤</div>
          <div className="flex flex-wrap gap-1.5">
            {PALETTES.map((p) => {
              const active = palette === p.key;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPal(p.key)}
                  aria-label={p.label}
                  aria-pressed={active}
                  title={p.label}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition ${active ? "border-accent ring-2 ring-accent/40" : "border-black/20 dark:border-white/25"}`}
                  style={{ background: p.dot }}
                >
                  {active && <Check size={13} className="text-black/70" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 選單材質：玻璃 ↔ 實色（玻璃保留 backdrop-blur、讀得清） */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
            <span>選單透明度</span>
            <span className="tabular-nums">{Math.round(menuOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={2}
            value={Math.round(menuOpacity * 100)}
            onChange={(e) => setMenuOp(Number(e.target.value) / 100)}
            className="w-full accent-[var(--color-accent)]"
            aria-label="選單透明度"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-fg-muted">
            <span>玻璃</span><span>實色</span>
          </div>
        </div>
      </div>
    );
  }

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
            className="menu-surface absolute right-0 z-50 mt-1 w-36 max-h-72 overflow-y-auto rounded-xl border border-border shadow-lg py-1"
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
