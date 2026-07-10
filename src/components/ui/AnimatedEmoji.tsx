"use client";

import { useState } from "react";
import { notoWebp, emojiToNotoCode, fluentPng } from "@/lib/reactions";

/**
 * 動態 emoji，三段式 fallback：
 *   1) Google Noto Animated Emoji（動態 WebP，超輕、會動）
 *   2) Microsoft Fluent Emoji 3D（靜態但立體可愛、筆畫粗）— Noto 沒這顆時用它，比純字元好看
 *   3) 作業系統的純 emoji 字元（前兩者都載不到才用）
 * - 只是一張 <img>、零 JS runtime；每段載失敗自動往下退。
 * - `code` 給 Noto 路徑段（如 "1f92f"）；沒有 code 就從 emoji 自動推導。
 * - `play`（預設 true）控制要不要動；false 直接用純字元（清單/大量渲染時省資源）。
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
  // stage: 0=Noto 動態、1=Fluent 3D、2=純字元
  const [stage, setStage] = useState(0);
  // code 沒給就從 emoji 自動推導 Noto 路徑（Noto 沒動畫的會 onError 進下一段）
  const resolved = code ?? emojiToNotoCode(emoji);

  if (!resolved || !play || stage >= 2) {
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

  const src = stage === 0 ? notoWebp(resolved) : fluentPng(emoji);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // key 綁 stage → 換 src 時強制重掛，確保 onError 能再觸發下一段
      key={stage}
      src={src}
      alt={title ?? emoji}
      title={title}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setStage((s) => s + 1)}
      className={`inline-block align-middle select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
