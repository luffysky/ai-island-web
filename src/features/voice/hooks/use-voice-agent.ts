"use client";
// 語音「輸出」側：依偏好朗讀 Agent 回覆（先 sanitize），同一任務只唸一次。
// 輸入側在 useSpeechRecognition / VoiceControls。兩者都走既有文字 pipeline，不建第二套 Agent。
import { useCallback, useRef } from "react";
import { useSpeechSynthesis } from "./use-speech-synthesis";
import { useVoicePrefs } from "./use-voice-prefs";

export function useVoiceReply() {
  const synth = useSpeechSynthesis();
  const { prefs } = useVoicePrefs();
  const spokenRef = useRef<string>("");

  /** 任務完成時呼叫；replyEnabled 開啟且同任務沒唸過才唸。 */
  const maybeSpeak = useCallback((taskId: string, displayText: string) => {
    if (!prefs.replyEnabled || !synth.supported) return;
    if (!taskId || !displayText.trim() || spokenRef.current === taskId) return;
    spokenRef.current = taskId;
    void synth.speak(displayText, {
      rate: prefs.speechRate,
      pitch: prefs.speechPitch,
      voiceName: prefs.preferredVoice,
    });
  }, [prefs, synth]);

  return { speaking: synth.speaking, stop: synth.stop, supported: synth.supported, maybeSpeak };
}
