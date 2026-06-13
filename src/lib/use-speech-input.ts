"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 語音輸入 hook — 包瀏覽器內建的 Web Speech API（SpeechRecognition）
 *
 * 全在使用者裝置上跑、零後端、零 API 費用。講話自動轉文字、再走原本的送出流程。
 * 偵測不到（Firefox / iOS 加到主畫面的 PWA）時 supported=false、由 UI 自動把麥克風鈕藏起來。
 *
 * 用法：
 *   const { supported, listening, toggle } = useSpeechInput({
 *     onResult: (t) => setInput((p) => p + t),
 *   });
 */
function getRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeechInput({
  lang = "zh-TW",
  onResult,
  onInterim,
  onError,
}: {
  lang?: string;
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  // 用 ref 保存最新的 callback、避免每次 render 重建 recognition
  const cbRef = useRef({ onResult, onInterim, onError });
  cbRef.current = { onResult, onInterim, onError };

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    // 已有正在跑的 → 先收掉
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {}
      recRef.current = null;
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false; // 講完一句就停、不一直開著吃電
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim && cbRef.current.onInterim) cbRef.current.onInterim(interim);
      if (final) cbRef.current.onResult(final);
    };

    rec.onerror = (e: any) => {
      const code = e?.error;
      // no-speech / aborted 不算錯、安靜結束
      if (code && code !== "no-speech" && code !== "aborted") {
        const msg =
          code === "not-allowed" || code === "service-not-allowed"
            ? "麥克風權限被擋住、請到瀏覽器允許麥克風"
            : `語音輸入失敗（${code}）`;
        cbRef.current.onError?.(msg);
      }
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // unmount 時收掉、避免麥克風一直開著
  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {}
    },
    [],
  );

  return { supported, listening, start, stop, toggle };
}
