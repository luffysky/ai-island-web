// TTS 實作：Web Speech API 的 speechSynthesis。免費、純瀏覽器、無後端。
import type { TextToSpeechProvider, SpeechOptions } from "../types";

export class BrowserTextToSpeechProvider implements TextToSpeechProvider {
  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  speak(text: string, options: SpeechOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported() || !text.trim()) { resolve(); return; }
      // 開講前先停掉正在唸的（規格 §三：再次收音前先停播）。
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }

      const u = new SpeechSynthesisUtterance(text);
      u.lang = options.lang ?? "zh-TW";
      u.rate = clamp(options.rate ?? 1, 0.5, 2);
      u.pitch = clamp(options.pitch ?? 1, 0, 2);
      if (options.voiceName) {
        const v = window.speechSynthesis.getVoices().find((x) => x.name === options.voiceName);
        if (v) u.voice = v;
      }
      // 不管結束/被打斷/出錯都 resolve（不 reject）——朗讀失敗不該讓上層爆掉。
      u.onend = () => resolve();
      u.onerror = () => resolve();
      try { window.speechSynthesis.speak(u); } catch { resolve(); }
    });
  }

  stop(): void {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
  pause(): void {
    try { window.speechSynthesis.pause(); } catch { /* ignore */ }
  }
  resume(): void {
    try { window.speechSynthesis.resume(); } catch { /* ignore */ }
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
