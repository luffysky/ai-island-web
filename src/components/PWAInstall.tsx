"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Service Worker 註冊 + 新版本更新提示
 *
 * 自動：
 *  - mount 時註冊 /sw.js
 *  - 監聽 SW updatefound、出「有新版本」提示條、點更新自動 reload
 *
 * 註：「安裝 App」提示已集中在 <PWAInstallPrompt />（避免兩個元件都攔
 *     beforeinstallprompt、同時跳兩張安裝卡）。這裡只負責 SW + 更新。
 */
export function PWAInstall() {
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((r) => {
        // 偵測 update available
        r.addEventListener("updatefound", () => {
          const sw = r.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(r);
            }
          });
        });
      })
      .catch(() => {});

    // 監聽 controller change (新 SW 接手) → 自動刷新
    const onCtrl = () => {
      if (updateReady) {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onCtrl);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onCtrl);
  }, [updateReady]);

  const applyUpdate = () => {
    if (!updateReady?.waiting) {
      window.location.reload();
      return;
    }
    updateReady.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  if (!updateReady) return null;

  return (
    <div
      className="fixed z-[60] left-2 right-2 bottom-2 md:left-auto md:right-4 md:bottom-4 md:max-w-sm
                 bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-cyan-500/20
                 border border-purple-400/60 rounded-2xl shadow-2xl shadow-purple-500/20 p-4
                 flex items-start gap-3"
      role="alert"
    >
      <RefreshCw size={26} className="text-purple-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">有新版本可以用了</div>
        <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
          AI 島剛剛上了新功能 / 修了 bug、點更新立刻換成新版。會自動 reload。
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyUpdate}
            className="px-3 py-1.5 rounded-full bg-purple-400 text-black font-bold text-xs inline-flex items-center gap-1 hover:scale-105 transition"
          >
            <RefreshCw size={11} aria-hidden="true" /> 立刻更新
          </button>
          <button
            onClick={() => setUpdateReady(null)}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-fg-muted hover:border-accent"
          >
            下次再說
          </button>
        </div>
      </div>
    </div>
  );
}
