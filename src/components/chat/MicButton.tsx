"use client";

import { Mic } from "lucide-react";
import { useSpeechInput } from "@/lib/use-speech-input";

/**
 * 語音輸入麥克風鈕（共用）。講話自動轉文字、透過 onResult 回拋給 caller 塞進輸入框。
 * 瀏覽器不支援（Firefox / iOS PWA）→ 直接 return null、不顯示、不影響打字。
 */
export function MicButton({
  onResult,
  onInterim,
  onError,
  disabled,
  lang = "zh-TW",
  className = "",
  size = 16,
}: {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
  lang?: string;
  className?: string;
  size?: number;
}) {
  const { supported, listening, toggle } = useSpeechInput({ lang, onResult, onInterim, onError });
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "停止語音輸入" : "語音輸入"}
      title={listening ? "停止語音輸入" : "語音輸入（講話自動轉文字）"}
      className={`relative transition disabled:opacity-30 ${listening ? "text-red-500" : ""} ${className}`}
    >
      <Mic size={size} className={listening ? "animate-pulse" : ""} />
      {listening && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
      )}
    </button>
  );
}
