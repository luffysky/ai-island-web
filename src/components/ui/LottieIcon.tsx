"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Lottie Icon — 用在「視覺重點」(Hero / Empty state / 重要 CTA / 慶祝)
 *
 * 不是 functional icon (button / tab / 表單) 的替代品。
 * 那些位置請繼續用 lucide-react (inline SVG、< 1KB、無 JS runtime)。
 *
 * 用法：
 *   <LottieIcon src="https://lottie.host/xxx.lottie" size={64} loop autoplay />
 *
 * 取得 .lottie / .json URL：
 *   - LottieFiles → 動畫詳細頁 → Download → 選 .lottie → 拿 lottie.host CDN URL
 *   - 或自己 host 到 public/lotties/xxx.lottie 然後 src="/lotties/xxx.lottie"
 *
 * 不裝 npm 套件、走 unpkg CDN 的 dotlottie web component。
 */
export function LottieIcon({
  src,
  size = 48,
  width,
  height,
  loop = true,
  autoplay = true,
  speed = 1,
  className = "",
  fallback,
}: {
  src: string;
  size?: number;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  className?: string;
  /** Lottie 載不出來時的 fallback (給 lucide icon 或 emoji) */
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [errored, setErrored] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const w = width ?? size;
  const h = height ?? size;

  if (errored || !src) {
    return fallback ?? <div style={{ width: w, height: h }} aria-hidden />;
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.0/dist/dotlottie-wc.js"
        type="module"
        strategy="afterInteractive"
      />
      <span
        className={`inline-block ${className}`}
        style={{ width: w, height: h, lineHeight: 0 }}
      >
        {mounted ? (
          // @ts-expect-error custom element from CDN
          <dotlottie-wc
            src={src}
            autoplay={autoplay ? "" : undefined}
            loop={loop ? "" : undefined}
            speed={String(speed)}
            style={{ width: "100%", height: "100%", display: "block" }}
            onerror={() => setErrored(true)}
          />
        ) : (
          fallback ?? <div style={{ width: w, height: h }} aria-hidden />
        )}
      </span>
    </>
  );
}
