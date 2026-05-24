"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DAYS = 7;

/**
 * PWA 安裝提示 + Service Worker 註冊
 *
 * 自動：
 *  - mount 時註冊 /sw.js
 *  - 監聽 beforeinstallprompt、出 「安裝 AI 島 App」提示條
 *  - 使用者按「以後再說」7 天內不再顯示
 *  - 已安裝 (display-mode: standalone) 不顯示
 */
export function PWAInstall() {
  const [prompt, setPrompt] = useState<any | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // 註冊 service worker
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // silent — sw 跑不起來也不影響網站
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 已是 PWA standalone → 不提示
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    // 7 天內 dismiss 過 → 不提示
    try {
      const at = localStorage.getItem(DISMISS_KEY);
      if (at) {
        const days = (Date.now() - Number(at)) / 86400_000;
        if (days < DISMISS_DAYS) return;
      }
    } catch {}

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const install = async () => {
    if (!prompt) return;
    setInstalling(true);
    try {
      prompt.prompt();
      await prompt.userChoice;
      setShow(false);
      setPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (!show || !prompt) return null;

  return (
    <div
      className="fixed z-[60] left-2 right-2 bottom-2 md:left-auto md:right-4 md:bottom-4 md:max-w-sm
                 bg-bg-card border border-accent/40 rounded-2xl shadow-2xl shadow-accent/20 p-4
                 flex items-start gap-3"
      role="alert"
    >
      <div className="text-3xl flex-shrink-0">🏝️</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">把 AI 島裝成 App</div>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
          桌面 / 手機主畫面一鍵打開、有 offline 快取、像原生 app 一樣順。
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={install}
            disabled={installing}
            className="px-3 py-1.5 rounded-full bg-accent text-black font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Download size={11} /> 立刻安裝
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-fg-muted hover:border-accent"
          >
            以後再說
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="關閉"
        className="text-fg-muted hover:text-fg p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
