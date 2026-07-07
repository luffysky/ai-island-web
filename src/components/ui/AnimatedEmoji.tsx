"use client";

import { useState } from "react";
import { notoWebp, emojiToNotoCode } from "@/lib/reactions";

/**
 * 動態 emoji（Google Noto Animated Emoji 的動態 WebP）。
 * - 只是一張 <img>、零 JS runtime、超輕；載不出來自動退回純 emoji 文字。
 * - `code` 給 Noto 路徑段（如 "1f92f"）；沒有 code 就直接顯示 emoji。
 * - `play`（預設 true）控制要不要動；false 時用靜態 emoji（清單/大量渲染時省資源）。
 */
export function AnimatedEmoji({
  code,
  emoji,
  size = 24,
  play = true,
  className = "",
  title,
}: {
  code?: string;
  emoji: string;
  size?: number;
  play?: boolean;
  className?: string;
  title?: string;
}) {
  const [errored, setErrored] = useState(false);
  // code 沒給就從 emoji 自動推導 Noto 路徑（Noto 沒動畫的會 onError fallback）
  const resolved = code ?? emojiToNotoCode(emoji);

  if (!resolved || errored || !play) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        style={{ fontSize: size * 0.9, width: size, height: size }}
        role="img"
        aria-label={title ?? emoji}
        title={title}
      >
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={notoWebp(resolved)}
      alt={title ?? emoji}
      title={title}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={`inline-block align-middle select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
