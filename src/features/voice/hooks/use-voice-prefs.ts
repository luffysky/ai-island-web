"use client";
// 語音偏好：localStorage 先行、不進 DB（GPT 點 9）。同分頁多個消費者靠 custom event 同步。
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_VOICE_PREFS, type VoicePreferences } from "../types";

const KEY = "ai-island-voice-prefs";
const EVT = "ai-island-voice-prefs-changed";

function load(): VoicePreferences {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_VOICE_PREFS, ...(JSON.parse(raw) as Partial<VoicePreferences>) } : DEFAULT_VOICE_PREFS;
  } catch {
    return DEFAULT_VOICE_PREFS;
  }
}

export function useVoicePrefs() {
  // 首渲染回預設（與 SSR 一致、免 hydration mismatch），mount 後才讀 localStorage。
  const [prefs, setPrefs] = useState<VoicePreferences>(DEFAULT_VOICE_PREFS);

  useEffect(() => {
    setPrefs(load());
    const onChange = () => setPrefs(load());
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) onChange(); };
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<VoicePreferences>) => {
    const next = { ...load(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setPrefs(next);
    window.dispatchEvent(new Event(EVT));
  }, []);

  return { prefs, update };
}
