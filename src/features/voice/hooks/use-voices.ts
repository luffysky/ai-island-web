"use client";
// 列出瀏覽器可用的中文語音（讓使用者挑更自然的音色）。getVoices() 首次可能是空的，
// 要等 voiceschanged 事件才填滿 → 這裡監聽並更新。
import { useEffect, useState } from "react";

export interface VoiceOption { name: string; lang: string }

export function useVoices(): VoiceOption[] {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      // 列出「全部」可用語音（讓使用者一個語言/國家可試多個音色）；中文排前面（中文文字用中文語音最準）。
      const list = window.speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang }));
      list.sort((a, b) => {
        const az = /^zh/i.test(a.lang) ? 0 : 1, bz = /^zh/i.test(b.lang) ? 0 : 1;
        return az - bz || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      });
      setVoices(list);
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  return voices;
}
