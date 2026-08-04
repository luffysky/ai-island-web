// TTS 實作：Web Speech API 的 speechSynthesis。免費、純瀏覽器、無後端。
import type { TextToSpeechProvider, SpeechOptions } from "../types";

/** 把長文切成句子級小段（≤~160 字）。修 Chrome「唸到一半自己停」——長 utterance 會被 ~15 秒看門狗砍掉，
 *  切成短段逐段接力唸就不會被砍。純函式、可測。 */
export function chunkForSpeech(text: string, maxLen = 160): string[] {
  const clean = String(text ?? "").trim();
  if (!clean) return [];
  // 在句末標點/換行後切（保留標點）
  const parts = clean.split(/(?<=[。！？!?；;\n])/);
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if (buf && (buf + p).length > maxLen) { out.push(buf.trim()); buf = p; }
    else buf += p;
    // 單段仍過長（沒有標點的長句）→ 硬切
    while (buf.length > maxLen) { out.push(buf.slice(0, maxLen)); buf = buf.slice(maxLen); }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [clean];
}

export class BrowserTextToSpeechProvider implements TextToSpeechProvider {
  private gen = 0;   // 世代序號：stop() 或新的 speak() 會 ++，讓進行中的接力鏈自動停

  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  speak(text: string, options: SpeechOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) { resolve(); return; }
      const chunks = chunkForSpeech(text);
      if (!chunks.length) { resolve(); return; }
      const myGen = ++this.gen;
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      const pickVoice = () => (options.voiceName ? window.speechSynthesis.getVoices().find((v) => v.name === options.voiceName) : undefined);
      let i = 0;
      const next = () => {
        if (myGen !== this.gen) { resolve(); return; }   // 被 stop / 新 speak 取代 → 收手
        if (i >= chunks.length) { resolve(); return; }
        const u = new SpeechSynthesisUtterance(chunks[i++]);
        u.rate = clamp(options.rate ?? 1, 0.5, 2);
        u.pitch = clamp(options.pitch ?? 1, 0, 2);
        const v = pickVoice();
        if (v) { u.voice = v; u.lang = v.lang || options.lang || "zh-TW"; }  // lang 對齊選定音色，否則 Chrome 可能忽略 u.voice
        else { u.lang = options.lang ?? "zh-TW"; }
        u.onend = () => next();
        u.onerror = () => next();   // 這段失敗 → 跳下一段、不整個停
        try { window.speechSynthesis.speak(u); } catch { next(); }
      };
      next();
    });
  }

  stop(): void {
    this.gen++;   // 讓進行中的接力鏈在下個 onend 收手
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
