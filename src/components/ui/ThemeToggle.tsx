"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

/**
 * 暗黑 / 明亮 / 跟系統 三段切換。
 * 用 localStorage 記憶 + 寫到 <html data-theme="...">。
 * globals.css 內 [data-theme="light"] 覆寫 CSS var。
 */

type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "ai_island_theme";

function applyTheme(t: Theme) {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  const effective = t === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : t;
  html.setAttribute("data-theme", effective);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    setTheme(saved);
    applyTheme(saved);
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

  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-bg-card border border-border" role="group" aria-label="主題切換">
      <button
        onClick={() => set("dark")}
        className={`p-1.5 rounded-full ${theme === "dark" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}
        title="暗黑"
        aria-label="暗黑模式"
      >
        <Moon size={13} />
      </button>
      <button
        onClick={() => set("system")}
        className={`p-1.5 rounded-full ${theme === "system" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}
        title="跟系統"
        aria-label="跟系統模式"
      >
        <Monitor size={13} />
      </button>
      <button
        onClick={() => set("light")}
        className={`p-1.5 rounded-full ${theme === "light" ? "bg-accent text-black" : "text-fg-muted hover:text-fg"}`}
        title="明亮"
        aria-label="明亮模式"
      >
        <Sun size={13} />
      </button>
    </div>
  );
}
