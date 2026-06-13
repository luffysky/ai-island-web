"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 語音輸出 hook — 包瀏覽器內建的 Web Speech API（speechSynthesis）
 *
 * 朗讀 AI 已回傳的文字、全在使用者裝置上跑、零後端、零 API 費用。
 * 幾乎所有瀏覽器（含 iOS PWA）都支援；偵測不到時 supported=false、由 UI 自動藏鈕。
 */

// 把 markdown / code 清成適合朗讀的純文字（不然會把 ``` 跟符號一起念出來）
function toSpeakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "，（程式碼略過），") // code block
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 圖片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 連結 → 只留文字
    .replace(/^#{1,6}\s+/gm, "") // 標題符號
    .replace(/[*_>~]/g, "") // 其餘 md 符號
    .replace(/\n{2,}/g, "。")
    .replace(/\n/g, "，")
    .trim();
}

export function useSpeechOutput({ lang = "zh-TW" }: { lang?: string } = {}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const clean = toSpeakable(text);
      if (!clean) return;
      window.speechSynthesis.cancel(); // 先停掉上一段
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      // 挑中文語音（有就用、沒有讓瀏覽器照 lang 自己決定）
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find((v) => v.lang?.toLowerCase().startsWith("zh"));
      if (zh) u.voice = zh;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      utterRef.current = u;
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    },
    [lang],
  );

  const toggle = useCallback(
    (text: string) => {
      if (speaking) stop();
      else speak(text);
    },
    [speaking, speak, stop],
  );

  // unmount 收掉、避免換頁還在念
  useEffect(
    () => () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    },
    [],
  );

  return { supported, speaking, speak, stop, toggle };
}
