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
      const all = window.speechSynthesis.getVoices();
      // 中文語音優先（zh-TW / zh-CN / zh-HK…）；沒有中文才退回全部
      const zh = all.filter((v) => /^zh/i.test(v.lang));
      const list = (zh.length ? zh : all).map((v) => ({ name: v.name, lang: v.lang }));
      setVoices(list);
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  return voices;
}
