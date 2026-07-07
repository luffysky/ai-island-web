"use client";

import { Fragment } from "react";
import { AnimatedEmoji } from "./AnimatedEmoji";

// 抓 emoji（含 ZWJ 組合 + 變體選擇子）。split 用有 capture group 的 global regex。
const EMOJI_SPLIT = /(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic}|[️\u{1F3FB}-\u{1F3FF}])*)/gu;
// 判斷某段是不是 emoji（非 global、避免 lastIndex 狀態）。
const IS_EMOJI = /^\p{Extended_Pictographic}/u;

/**
 * 把一段純文字裡的 emoji 渲染成「動態 emoji」（Noto Animated），其餘文字照舊。
 * 用在貼文/留言/訊息的顯示端。Noto 沒動畫的 emoji 會自動 fallback 成靜態字元。
 */
export function EmojiText({ text, size = 20, className = "" }: { text: string; size?: number; className?: string }) {
  if (!text) return null;
  const parts = text.split(EMOJI_SPLIT);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part && IS_EMOJI.test(part) ? (
          <AnimatedEmoji key={i} emoji={part} size={size} />
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </span>
  );
}
