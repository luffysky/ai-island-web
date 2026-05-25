"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Lottie 背景動畫 (admin layout 用)
 *
 * 用 LottieFiles 的 dotlottie-wc Web Component (走 unpkg CDN、不裝 npm 套件)
 * - 支援 .lottie 跟 .json 兩種格式
 * - fixed 在最底層、不阻擋互動 (pointer-events: none)
 * - 預設低透明度 + blur、文字優先看得清
 *
 * 用法：
 *   <LottieBackground src="https://lottie.host/<id>.lottie" opacity={0.15} />
 *
 * src 取得方式 (林董)：
 *   1. 去 LottieFiles / IconScout / Useanimations 找喜歡的動畫
 *   2. Download 拿 .lottie 或 .json 連結 (or 自己 host 到 R2 / public/)
 *   3. 把 URL 貼進來
 *
 * 後台「應用設定 CRUD」可加一個 admin_lottie_url 變數、不用改 code 就能換動畫。
 */
export function LottieBackground({
  src,
  opacity = 0.15,
  blur = 1,
  speed = 0.5,
  enabled = true,
}: {
  src?: string;
  opacity?: number;
  blur?: number;
  speed?: number;
  enabled?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!enabled || !src) return null;

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.6.0/dist/dotlottie-wc.js"
        type="module"
        strategy="afterInteractive"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
        style={{
          opacity: mounted ? opacity : 0,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          transition: "opacity 0.6s ease",
        }}
      >
        {/* @ts-expect-error custom element from lottie-wc CDN */}
        <dotlottie-wc
          src={src}
          autoplay
          loop
          speed={String(speed)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </div>
    </>
  );
}
