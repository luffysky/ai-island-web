"use client";
// React hook 包 TTS provider：朗讀 Agent 回覆、可停/暫停/續播。
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserTextToSpeechProvider } from "../providers/browser-text-to-speech";
import { sanitizeTextForSpeech } from "../utils/sanitize-text-for-speech";
import type { SpeechOptions, TextToSpeechProvider } from "../types";

export interface UseSpeechSynthesis {
  supported: boolean;
  speaking: boolean;
  /** 傳「Agent 顯示文字」進來，內部會先 sanitize 再唸。 */
  speak: (displayText: string, options?: SpeechOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useSpeechSynthesis(provider?: TextToSpeechProvider): UseSpeechSynthesis {
  const tts = useMemo<TextToSpeechProvider>(
    () => provider ?? new BrowserTextToSpeechProvider(),
    [provider],
  );
  const [supported] = useState(() => tts.isSupported());
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => { tts.stop(); }, [tts]);

  const speak = useCallback(async (displayText: string, options?: SpeechOptions) => {
    const { text } = sanitizeTextForSpeech(displayText);
    if (!text) return;
    setSpeaking(true);
    try { await tts.speak(text, options); } finally { setSpeaking(false); }
  }, [tts]);

  const stop = useCallback(() => { tts.stop(); setSpeaking(false); }, [tts]);
  const pause = useCallback(() => { tts.pause(); }, [tts]);
  const resume = useCallback(() => { tts.resume(); }, [tts]);

  return { supported, speaking, speak, stop, pause, resume };
}
