// 把語音錯誤轉成使用者看得懂的繁中訊息（規格 §三 error）。不顯示原始 exception。
import type { SpeechError, SpeechErrorCode } from "../types";

const MESSAGES: Record<SpeechErrorCode, string> = {
  "not-supported": "這個瀏覽器不支援語音辨識，已切回文字輸入。",
  "permission-denied": "尚未允許使用麥克風。請在瀏覽器允許麥克風權限後再試。",
  "no-speech": "沒有偵測到聲音，請再說一次。",
  "aborted": "語音辨識已中止。",
  "audio-capture": "找不到麥克風裝置，請確認麥克風已連接。",
  "network": "語音服務或網路發生問題，請稍後再試。",
  "unknown": "語音辨識發生問題，請再試一次。",
};

export function speechErrorMessage(error: SpeechError | SpeechErrorCode): string {
  const code = typeof error === "string" ? error : error.code;
  return MESSAGES[code] ?? MESSAGES.unknown;
}

/** 把瀏覽器 SpeechRecognition 的 error 字串正規化成我們的 code。 */
export function normalizeRecognitionError(raw: string | undefined): SpeechErrorCode {
  switch (raw) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission-denied";
    case "no-speech":
      return "no-speech";
    case "aborted":
      return "aborted";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    default:
      return "unknown";
  }
}
