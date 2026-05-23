"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";

type ConsentValue = "accepted" | "essential-only" | null;

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY) as ConsentValue;
      if (!v) {
        // 延遲 800ms 顯示、避免破壞首屏體驗
        setTimeout(() => setShow(true), 800);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const accept = (value: "accepted" | "essential-only") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      // 也存 cookie、給 server 端讀
      document.cookie = `cookie-consent=${value}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
    } catch {}
    setShow(false);

    // 如果同意 analytics、啟用 GA
    if (value === "accepted") {
      window.dispatchEvent(new Event("cookie-consent-accepted"));
    }
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie 同意"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-bg-card border-t-2 border-accent shadow-2xl"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 text-sm leading-relaxed">
            <h3 className="font-bold mb-1 text-base">🍪 我們使用 Cookies</h3>
            <p className="text-fg-muted">
              本平台使用 Cookies 提供登入、學習進度等核心功能、並可選用分析型 Cookies 改善服務。
              點選「全部同意」表示您同意我們使用所有 Cookies、或選「僅必要」拒絕分析型。
              詳見 <Link href="/cookies" className="text-accent underline">Cookie 政策</Link>
              · <Link href="/privacy" className="text-accent underline">隱私權政策</Link>
            </p>

            {showDetails && (
              <div className="mt-3 p-3 bg-bg-elevated rounded text-xs space-y-2">
                <div>
                  <strong>必要型</strong>：登入、安全、Cookie 同意紀錄。
                  關閉將無法登入。
                </div>
                <div>
                  <strong>功能型</strong>：主題、語言偏好等。
                </div>
                <div>
                  <strong>分析型（可選）</strong>：Google Analytics、匿名化使用者行為。
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg-elevated transition"
            >
              {showDetails ? "收起" : "詳情"}
            </button>
            <button
              onClick={() => accept("essential-only")}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg-elevated transition"
            >
              僅必要
            </button>
            <button
              onClick={() => accept("accepted")}
              className="px-4 py-2 text-sm bg-accent text-black rounded-lg font-bold hover:scale-105 transition"
            >
              全部同意
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
