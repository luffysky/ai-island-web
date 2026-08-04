// STT 實作：Web Speech API 的 (webkit)SpeechRecognition。免費、純瀏覽器、無後端。
// SpeechRecognition 未進 TS lib.dom → 這裡定義最小介面，不用 any 滿天飛。
import type {
  SpeechToTextProvider,
  SpeechRecognitionOptions,
  SpeechError,
} from "../types";
import { normalizeRecognitionError } from "../utils/speech-error-message";

interface MinimalRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}
interface MinimalRecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: MinimalRecognitionResult };
}
interface MinimalRecognitionErrorEvent { error?: string; message?: string }
interface MinimalRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: MinimalRecognitionEvent) => void) | null;
  onerror: ((e: MinimalRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => MinimalRecognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class BrowserSpeechToTextProvider implements SpeechToTextProvider {
  private recognition: MinimalRecognition | null = null;
  private partialCbs = new Set<(t: string) => void>();
  private finalCbs = new Set<(t: string) => void>();
  private errorCbs = new Set<(e: SpeechError) => void>();
  private running = false;

  isSupported(): boolean {
    return getCtor() !== null;
  }

  start(options: SpeechRecognitionOptions = {}): Promise<void> {
    const Ctor = getCtor();
    if (!Ctor) {
      this.emitError({ code: "not-supported" });
      return Promise.reject(new Error("not-supported"));
    }
    // 押一次一段（非常駐）：continuous=false，避免麥克風長開（規格 §四 push-to-talk）。
    this.abort();
    const rec = new Ctor();
    rec.lang = options.lang ?? "zh-TW";
    rec.interimResults = options.interimResults ?? true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) this.finalCbs.forEach((cb) => cb(text));
        else this.partialCbs.forEach((cb) => cb(text));
      }
    };
    rec.onerror = (e) => {
      this.emitError({ code: normalizeRecognitionError(e.error), raw: e.error ?? e.message });
    };
    rec.onend = () => { this.running = false; };

    this.recognition = rec;
    try {
      rec.start();
      this.running = true;
      return Promise.resolve();
    } catch (err) {
      this.running = false;
      this.emitError({ code: "unknown", raw: (err as Error)?.message });
      return Promise.reject(err);
    }
  }

  stop(): void {
    try { this.recognition?.stop(); } catch { /* ignore */ }
  }

  abort(): void {
    if (!this.recognition) return;
    try { this.recognition.abort(); } catch { /* ignore */ }
    this.recognition.onresult = null;
    this.recognition.onerror = null;
    this.recognition.onend = null;
    this.recognition = null;
    this.running = false;
  }

  onPartialResult(cb: (t: string) => void): () => void {
    this.partialCbs.add(cb);
    return () => this.partialCbs.delete(cb);
  }
  onFinalResult(cb: (t: string) => void): () => void {
    this.finalCbs.add(cb);
    return () => this.finalCbs.delete(cb);
  }
  onError(cb: (e: SpeechError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  private emitError(e: SpeechError) {
    this.errorCbs.forEach((cb) => cb(e));
  }
}
