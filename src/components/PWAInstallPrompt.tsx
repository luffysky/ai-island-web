"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL = 14 * 86400_000; // 14 天

declare global {
  interface WindowEventMap {
    beforeinstallprompt: any;
  }
}

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<any | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // 14 天內 dismiss 過 → skip
    try {
      const at = localStorage.getItem(DISMISS_KEY);
      if (at && Date.now() - Number(at) < DISMISS_TTL) return;
    } catch {}

    // 已 install → skip
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Android / Chrome：beforeinstallprompt
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari：沒有 beforeinstallprompt、要手動引導
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    if (isIOS) {
      // 3 秒後出現 iOS hint（避免一進來就跳）
      const t = setTimeout(() => { setIosHint(true); setShow(true); }, 3_000);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setShow(false);
    if (outcome === "accepted") {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_TTL)); } catch {}
    } else {
      dismiss();
    }
  }

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 bg-bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4">
      <button onClick={dismiss} className="absolute top-2 right-2 p-1.5 text-fg-muted hover:text-fg"><X size={16} /></button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
          <Smartphone size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold mb-1">把 AI 島裝到手機？</h3>
          {iosHint ? (
            <p className="text-xs text-fg-muted leading-relaxed">
              iOS 用戶：點 Safari 底部「分享」按鈕 → 滑到「加入主畫面」、雪鑰一鍵秒進。
            </p>
          ) : (
            <p className="text-xs text-fg-muted leading-relaxed">
              全螢幕無瀏覽器 bar、shortcut 一鍵開「履歷 / 面試 / 週賽」、學員陪伴感更強。
            </p>
          )}
          {!iosHint && (
            <button onClick={install} className="btn-chip btn-chip-success mt-3 w-full justify-center py-2">
              <Download size={14} /> 加到主畫面
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
