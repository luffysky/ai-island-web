"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL = 14 * 86400_000; // 「以後再說」14 天內不再跳
const SESSION_KEY = "pwa_install_shown"; // 同一 session 最多出現一次、不 nag

declare global {
  interface WindowEventMap {
    beforeinstallprompt: any;
  }
}

/**
 * 全站唯一的「安裝 App」提示（SW / 更新提示在 <PWAInstall />）
 *
 * 行為：
 *  - Android / Chrome：攔 beforeinstallprompt、出可安裝卡
 *  - iOS Safari：沒有 beforeinstallprompt → 出「分享 → 加到主畫面」引導
 *  - 已安裝（standalone）不跳
 *  - 每個 session 最多出現一次（sessionStorage）、不 nag
 *  - 「以後再說」記 localStorage、14 天內不再跳
 */
export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<any | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 已安裝 → skip
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    // iOS 舊版 standalone 判斷
    if ((navigator as any).standalone === true) return;

    // 本 session 已顯示過 → skip（不 nag）
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {}

    // 14 天內按過「以後再說」→ skip
    try {
      const at = localStorage.getItem(DISMISS_KEY);
      if (at && Date.now() - Number(at) < DISMISS_TTL) return;
    } catch {}

    const markShown = () => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    };

    // Android / Chrome：beforeinstallprompt
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
      markShown();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari：沒有 beforeinstallprompt、手動引導（3 秒後、避免一進來就跳）
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    let t: ReturnType<typeof setTimeout> | null = null;
    if (isIOS) {
      t = setTimeout(() => {
        setIosHint(true);
        setShow(true);
        markShown();
      }, 3_000);
    }

    // 安裝完成 → 收起
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setShow(false);
    setDeferred(null);
    if (outcome !== "accepted") {
      // 拒絕 → 記 dismiss、14 天內不再跳
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    }
  }

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 bg-bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4"
      role="dialog"
      aria-label="安裝 AI 島 App"
    >
      <button
        onClick={dismiss}
        aria-label="關閉安裝提示"
        className="absolute top-2 right-2 p-1.5 text-fg-muted hover:text-fg"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
          <Smartphone size={22} className="text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold mb-1">把 AI 島裝成 App</h3>
          {iosHint ? (
            <p className="text-xs text-fg-muted leading-relaxed">
              iOS 用戶：點 Safari 底部
              <Share size={12} className="inline mx-0.5 -mt-0.5" aria-label="分享" />
              「分享」按鈕 → 滑到「加入主畫面」、一鍵秒進、全螢幕無瀏覽器 bar。
            </p>
          ) : (
            <p className="text-xs text-fg-muted leading-relaxed">
              桌面 / 手機主畫面一鍵打開、全螢幕無瀏覽器 bar、有 offline 快取、像原生 App 一樣順。
            </p>
          )}
          {!iosHint && (
            <button
              onClick={install}
              className="btn-chip btn-chip-success mt-3 w-full justify-center py-2"
              aria-label="安裝 AI 島 App 到主畫面"
            >
              <Download size={14} aria-hidden="true" /> 加到主畫面
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
