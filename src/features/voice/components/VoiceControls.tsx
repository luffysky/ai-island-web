"use client";
// 語音輸入控制：麥克風 + 狀態 + 即時辨識預覽 + autoSend 倒數 + 設定（localStorage）。
// 只負責「輸入側」；朗讀回覆由父層 useVoiceReply 處理（speaking/onStopSpeaking 傳進來）。
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Settings2, X } from "lucide-react";
import { useSpeechRecognition } from "../hooks/use-speech-recognition";
import { useVoicePrefs } from "../hooks/use-voice-prefs";
import { speechErrorMessage } from "../utils/speech-error-message";

interface Props {
  disabled?: boolean;
  /** 即時把辨識文字填進輸入框（interim + final）。 */
  onTranscript: (text: string) => void;
  /** autoSend 倒數結束後送出。 */
  onSubmit: (text: string) => void;
  /** 目前是否正在朗讀回覆。 */
  speaking?: boolean;
  /** 停止朗讀（按麥克風前會先呼叫）。 */
  onStopSpeaking?: () => void;
}

const AUTO_SEND_MS = 1600;

export function VoiceControls({ disabled, onTranscript, onSubmit, speaking, onStopSpeaking }: Props) {
  const rec = useSpeechRecognition();
  const { prefs, update } = useVoicePrefs();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [countdown, setCountdown] = useState<{ text: string } | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 即時把中途辨識填進輸入框
  useEffect(() => { if (rec.interim) onTranscript(rec.interim); }, [rec.interim, onTranscript]);

  const clearCountdown = useCallback(() => {
    if (countdownTimer.current) { clearTimeout(countdownTimer.current); countdownTimer.current = null; }
    setCountdown(null);
  }, []);

  const handleFinal = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    onTranscript(t);
    if (prefs.autoSend) {
      // 倒數 1–2 秒自動送出，期間可取消（規格 §四）
      setCountdown({ text: t });
      countdownTimer.current = setTimeout(() => { setCountdown(null); countdownTimer.current = null; onSubmit(t); }, AUTO_SEND_MS);
    }
  }, [prefs.autoSend, onTranscript, onSubmit]);

  const startListening = useCallback(() => {
    clearCountdown();
    onStopSpeaking?.();          // 再次收音前先停播（規格 §三）
    rec.reset();
    void rec.start(handleFinal, prefs.locale);
  }, [clearCountdown, onStopSpeaking, rec, handleFinal, prefs.locale]);

  const onMicClick = useCallback(() => {
    if (speaking) { onStopSpeaking?.(); return; }
    if (rec.listening) { rec.stop(); return; }
    if (countdown) { clearCountdown(); return; }
    startListening();
  }, [speaking, onStopSpeaking, rec, countdown, clearCountdown, startListening]);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  // 不支援 → 完全不顯示（保留純文字聊天，規格 §二 fallback）
  if (!rec.supported) return null;

  const listening = rec.listening;

  return (
    <div className="relative flex items-center gap-1.5">
      {/* 即時辨識預覽 / 倒數 / 錯誤：浮在按鈕上方 */}
      {(listening || countdown || rec.error) && (
        <div style={{ width: "16rem", maxWidth: "calc(100vw - 1.5rem)" }}
          className="absolute bottom-full right-0 mb-2 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-lg p-2.5 text-xs z-20">
          {rec.error ? (
            <p className="text-rose-600 dark:text-rose-400">{speechErrorMessage(rec.error)}</p>
          ) : countdown ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-black/70 dark:text-white/70 truncate">即將送出：「{countdown.text}」</span>
              <button onClick={clearCountdown} className="shrink-0 rounded-lg px-2 py-1 bg-black/5 dark:bg-white/10 hover:bg-black/10">取消</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-black/70 dark:text-white/70">
              <span className="inline-flex gap-0.5 items-end h-3">
                <span className="w-0.5 bg-rose-500 animate-pulse" style={{ height: "60%" }} />
                <span className="w-0.5 bg-rose-500 animate-pulse" style={{ height: "100%" }} />
                <span className="w-0.5 bg-rose-500 animate-pulse" style={{ height: "40%" }} />
              </span>
              <span className="truncate">{rec.interim || "正在聽你說話…"}</span>
            </div>
          )}
        </div>
      )}

      {/* 朗讀中：停止播放 */}
      {speaking && (
        <button onClick={() => onStopSpeaking?.()} title="停止朗讀"
          className="shrink-0 grid place-items-center w-10 h-10 rounded-xl border border-sky-500 bg-sky-500 text-white animate-pulse">
          <Volume2 className="w-4 h-4" />
        </button>
      )}

      {/* 設定 */}
      <div className="relative">
        <button onClick={() => setSettingsOpen((v) => !v)} title="語音設定" disabled={disabled}
          className="shrink-0 grid place-items-center w-10 h-10 rounded-xl border border-black/10 dark:border-white/15 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">
          <Settings2 className="w-4 h-4" />
        </button>
        {settingsOpen && (
          <div style={{ width: "15rem", maxWidth: "calc(100vw - 1.5rem)" }}
            className="absolute bottom-full right-0 mb-2 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-lg p-3 text-xs z-30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium">語音設定</span>
              <button onClick={() => setSettingsOpen(false)}><X className="w-3.5 h-3.5 text-black/40 dark:text-white/40" /></button>
            </div>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>辨識完自動送出</span>
              <input type="checkbox" checked={prefs.autoSend} onChange={(e) => update({ autoSend: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>朗讀分身回覆</span>
              <input type="checkbox" checked={prefs.replyEnabled} onChange={(e) => update({ replyEnabled: e.target.checked })} />
            </label>
            <label className="block">
              <span className="text-black/60 dark:text-white/60">朗讀語速：{prefs.speechRate.toFixed(1)}×</span>
              <input type="range" min={0.6} max={1.6} step={0.1} value={prefs.speechRate}
                onChange={(e) => update({ speechRate: Number(e.target.value) })} className="w-full mt-1" />
            </label>
            <p className="text-[11px] text-black/40 dark:text-white/40">設定只存在這個瀏覽器。語音不支援時自動退回文字。</p>
          </div>
        )}
      </div>

      {/* 麥克風 */}
      <button onClick={onMicClick} disabled={disabled} title={listening ? "停止收音" : "語音輸入"}
        className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl border transition disabled:opacity-50 ${
          listening ? "bg-rose-500 border-rose-500 text-white animate-pulse"
                     : "border-black/10 dark:border-white/15 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10"}`}>
        {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    </div>
  );
}
