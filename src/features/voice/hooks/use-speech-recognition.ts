"use client";
// React hook 包 STT provider：管 listening/partial/final/error，不含 Agent 邏輯。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserSpeechToTextProvider } from "../providers/browser-speech-to-text";
import type { SpeechError, SpeechToTextProvider } from "../types";

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  /** 目前中途辨識文字（尚未定案）。 */
  interim: string;
  error: SpeechError | null;
  /** 開始收音；final 結果透過 onFinal 回呼吐出。 */
  start: (onFinal: (text: string) => void, lang?: string) => Promise<void>;
  stop: () => void;
  abort: () => void;
  reset: () => void;
}

export function useSpeechRecognition(provider?: SpeechToTextProvider): UseSpeechRecognition {
  const stt = useMemo<SpeechToTextProvider>(
    () => provider ?? new BrowserSpeechToTextProvider(),
    [provider],
  );
  const [supported] = useState(() => stt.isSupported());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<SpeechError | null>(null);
  const onFinalRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    const offP = stt.onPartialResult((t) => setInterim(t));
    const offF = stt.onFinalResult((t) => {
      setInterim("");
      setListening(false);
      onFinalRef.current(t);
    });
    const offE = stt.onError((e) => {
      setError(e);
      setListening(false);
      setInterim("");
    });
    return () => { offP(); offF(); offE(); stt.abort(); };
  }, [stt]);

  const start = useCallback(async (onFinal: (text: string) => void, lang?: string) => {
    setError(null);
    setInterim("");
    onFinalRef.current = onFinal;
    try {
      await stt.start({ lang: lang ?? "zh-TW", interimResults: true });
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [stt]);

  const stop = useCallback(() => { stt.stop(); setListening(false); }, [stt]);
  const abort = useCallback(() => { stt.abort(); setListening(false); setInterim(""); }, [stt]);
  const reset = useCallback(() => { setError(null); setInterim(""); }, []);

  return { supported, listening, interim, error, start, stop, abort, reset };
}
