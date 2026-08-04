// 語音代理 — 型別與 provider 抽象介面（規格 docs/speech_agent.md §二）。
// 刻意不把 Web Speech API 寫死進聊天元件：這裡只定義介面，實作在 providers/。

/** 語音互動狀態機（規格 §三）。 */
export type VoiceState =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "processing"
  | "agent-working"
  | "speaking"
  | "error";

/** 錯誤代碼（轉繁中訊息見 utils/speech-error-message）。 */
export type SpeechErrorCode =
  | "not-supported"       // 瀏覽器不支援語音辨識
  | "permission-denied"   // 使用者未允許麥克風
  | "no-speech"           // 沒偵測到語音
  | "aborted"             // 中途停止
  | "audio-capture"       // 抓不到麥克風裝置
  | "network"             // 網路/瀏覽器語音服務錯誤
  | "unknown";

export interface SpeechError {
  code: SpeechErrorCode;
  /** 原始 event/exception 訊息，僅供 log，不直接顯示給使用者。 */
  raw?: string;
}

export interface SpeechRecognitionOptions {
  /** 預設 zh-TW。 */
  lang?: string;
  /** 是否回報中途（partial）結果，預設 true。 */
  interimResults?: boolean;
}

/** STT provider：把語音轉文字。實作見 BrowserSpeechToTextProvider。 */
export interface SpeechToTextProvider {
  isSupported(): boolean;
  start(options?: SpeechRecognitionOptions): Promise<void>;
  stop(): void;
  abort(): void;
  /** 回傳 unsubscribe 函式。 */
  onPartialResult(callback: (text: string) => void): () => void;
  onFinalResult(callback: (text: string) => void): () => void;
  onError(callback: (error: SpeechError) => void): () => void;
}

export interface SpeechOptions {
  lang?: string;
  /** 語速 0.1–10（Web Speech 預設 1）。 */
  rate?: number;
  /** 音調 0–2（預設 1）。 */
  pitch?: number;
  /** 指定 voice 名稱（speechSynthesis.getVoices() 的 name）。 */
  voiceName?: string;
}

/** TTS provider：把文字讀出來。實作見 BrowserTextToSpeechProvider。 */
export interface TextToSpeechProvider {
  isSupported(): boolean;
  /** resolve 於朗讀結束（或被 stop 打斷時 resolve、不 reject）。 */
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
}

// ── 本機使用者偏好（Batch 1 先 localStorage、不進 DB；GPT 點 9）──
export interface VoicePreferences {
  locale: string;
  /** 辨識完是否倒數自動送出（預設 false）。 */
  autoSend: boolean;
  /** 是否朗讀 Agent 回覆（預設 false）。 */
  replyEnabled: boolean;
  speechRate: number;
  speechPitch: number;
  preferredVoice?: string;
}

export const DEFAULT_VOICE_PREFS: VoicePreferences = {
  locale: "zh-TW",
  autoSend: false,
  replyEnabled: false,
  speechRate: 1,
  speechPitch: 1,
};
