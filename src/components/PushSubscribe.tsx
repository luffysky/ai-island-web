"use client";

/**
 * Web Push 訂閱 UI。
 *
 * - 只對「已登入」使用者顯示（呼叫端也應確認 user、雙保險）。
 * - 支援 Notification API + PushManager 才顯示。
 * - 讀 NEXT_PUBLIC_VAPID_PUBLIC_KEY；未設 → 不顯示（graceful）。
 * - 可關閉（dismiss）、狀態存 localStorage（ai-island:push-dismissed）。
 * - 已訂閱 / 已拒絕 → 顯示對應狀態、不再騷擾。
 * - iOS：需先「加入主畫面」安裝 PWA 才能推播、給提示。
 *
 * 設計成放在 NotificationsDropdown 面板底部的一列（compact）。
 */

import { useEffect, useState } from "react";
import { Bell, BellRing, X, Loader2, Check, Info } from "lucide-react";

const DISMISS_KEY = "ai-island:push-dismissed";
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  return iOS;
}

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as any).standalone === true
  );
}

type State = "loading" | "unsupported" | "default" | "denied" | "subscribed" | "busy";

export default function PushSubscribe() {
  const [state, setState] = useState<State>("loading");
  const [dismissed, setDismissed] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") { setDismissed(true); return; }

    // 未設 VAPID / 瀏覽器不支援 → 不顯示
    if (!VAPID_PUBLIC || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }

    (async () => {
      const perm = Notification.permission;
      if (perm === "denied") { setState("denied"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) { setState("subscribed"); return; }
      } catch { /* ignore */ }
      setState(perm === "granted" ? "default" : "default");
    })();
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const enable = async () => {
    setState("busy");
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "default"); return; }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("save failed");

      setState("subscribed");
      setMsg("已開啟！送一則測試給你…");
      // 送測試 push（best-effort）
      fetch("/api/push/test", { method: "POST", credentials: "include" }).catch(() => {});
    } catch (e: any) {
      setState("default");
      setMsg("開啟失敗、請稍後再試");
    }
  };

  if (dismissed || state === "unsupported") return null;

  // iOS 未安裝 PWA → 提示需先加入主畫面
  if (isIosSafari() && !isStandalonePWA() && state !== "subscribed") {
    return (
      <div className="px-4 py-2.5 border-t border-border flex items-start gap-2 text-[11px] text-fg-muted">
        <Info size={13} className="shrink-0 mt-0.5 text-accent" />
        <div className="flex-1">
          iOS 需先把 AI 島「加入主畫面」安裝成 App、才能開啟推播通知。
        </div>
        <button onClick={dismiss} aria-label="關閉" className="shrink-0 hover:text-fg">
          <X size={13} />
        </button>
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="px-4 py-2.5 border-t border-border flex items-center gap-2 text-[11px] text-green-400">
        <Check size={13} className="shrink-0" />
        <span className="flex-1">{msg || "已開啟瀏覽器推播通知"}</span>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="px-4 py-2.5 border-t border-border flex items-start gap-2 text-[11px] text-fg-muted">
        <BellRing size={13} className="shrink-0 mt-0.5" />
        <span className="flex-1">推播已被瀏覽器封鎖、請到網站設定開啟通知權限。</span>
        <button onClick={dismiss} aria-label="關閉" className="shrink-0 hover:text-fg">
          <X size={13} />
        </button>
      </div>
    );
  }

  // default / busy / loading
  return (
    <div className="px-4 py-2.5 border-t border-border flex items-center gap-2">
      <Bell size={14} className="shrink-0 text-accent" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium">開啟推播通知</div>
        <div className="text-[10px] text-fg-muted leading-tight">
          {msg || "有人讚你的作品、連勝快斷時第一時間通知你"}
        </div>
      </div>
      <button
        onClick={enable}
        disabled={state === "busy" || state === "loading"}
        className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md bg-accent text-black hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-1"
      >
        {state === "busy" ? <Loader2 size={11} className="animate-spin" /> : <BellRing size={11} />}
        開啟
      </button>
      <button onClick={dismiss} aria-label="關閉" className="shrink-0 text-fg-muted hover:text-fg">
        <X size={13} />
      </button>
    </div>
  );
}
