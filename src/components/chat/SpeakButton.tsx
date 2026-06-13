"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSpeechOutput } from "@/lib/use-speech-output";

/**
 * 朗讀鈕（共用）。把 AI 回答用瀏覽器內建語音念出來。
 * 不支援或沒文字 → return null、不顯示。
 */
export function SpeakButton({
  text,
  className = "",
  size = 11,
  lang = "zh-TW",
}: {
  text: string;
  className?: string;
  size?: number;
  lang?: string;
}) {
  const { supported, speaking, toggle } = useSpeechOutput({ lang });
  if (!supported || !text) return null;

  return (
    <button
      type="button"
      onClick={() => toggle(text)}
      aria-label={speaking ? "停止朗讀" : "朗讀"}
      title={speaking ? "停止朗讀" : "朗讀這則回答"}
      className={`inline-flex items-center transition hover:text-accent ${speaking ? "text-accent" : "text-fg-muted"} ${className}`}
    >
      {speaking ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
}
