"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, Copy, Check, Loader2, Languages, X, Volume2 } from "lucide-react";

// 常用世界語言（value = Google 語言碼）
const LANGS: { code: string; name: string }[] = [
  { code: "zh-TW", name: "繁體中文" },
  { code: "zh-CN", name: "简体中文" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "th", name: "ไทย" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "tr", name: "Türkçe" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "uk", name: "Українська" },
  { code: "fil", name: "Filipino" },
  { code: "fa", name: "فارسی" },
  { code: "he", name: "עברית" },
  { code: "sv", name: "Svenska" },
  { code: "el", name: "Ελληνικά" },
];
const nameOf = (code: string) => LANGS.find((l) => l.code === code)?.name ?? code;

export function TranslatorClient() {
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("en");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [detected, setDetected] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doTranslate = async (text: string, sl: string, tl: string) => {
    if (!text.trim()) { setOutput(""); setDetected(""); setErr(""); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: sl, target: tl }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.message || "翻譯失敗"); return; }
      setOutput(j.translated ?? "");
      setDetected(j.detected && sl === "auto" ? j.detected : "");
    } catch { setErr("翻譯失敗，請稍後再試"); } finally { setLoading(false); }
  };

  // debounce 自動翻
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doTranslate(input, source, target), 500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line
  }, [input, source, target]);

  const swap = () => {
    // auto 無法當目標；互換時 auto→繁中
    const newSource = target;
    const newTarget = source === "auto" ? "zh-TW" : source;
    setSource(newSource); setTarget(newTarget);
    setInput(output); setOutput(input);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const speak = (text: string, lang: string) => {
    try {
      if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "auto" ? (detected || "zh-TW") : lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-black inline-flex items-center gap-2">
          <Languages size={26} className="text-accent" /> 翻譯器
        </h1>
        <p className="text-sm text-fg-muted mt-1.5">支援世界各國語言 · 貼上文字即時翻譯（免費）</p>
      </header>

      {/* 語言列 */}
      <div className="flex items-center gap-2 mb-3">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="flex-1 min-w-0 bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent">
          <option value="auto">🌐 自動偵測{detected ? `（${nameOf(detected)}）` : ""}</option>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <button onClick={swap} title="來源 / 目標互換" className="shrink-0 w-10 h-10 grid place-items-center rounded-xl border border-border bg-bg-card hover:border-accent hover:text-accent transition">
          <ArrowRightLeft size={16} />
        </button>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="flex-1 min-w-0 bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent">
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>

      {/* 輸入 / 輸出 */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="relative rounded-2xl border border-border bg-bg-card p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 5000))}
            placeholder="輸入要翻譯的文字…"
            rows={9}
            className="w-full bg-transparent text-[15px] outline-none resize-none min-h-[180px] placeholder:text-fg-muted"
            autoFocus
          />
          <div className="flex items-center justify-between mt-1 text-fg-muted">
            <div className="flex items-center gap-2">
              {input && <button onClick={() => setInput("")} title="清空" className="hover:text-fg"><X size={15} /></button>}
              <button onClick={() => speak(input, source)} title="朗讀" className="hover:text-accent"><Volume2 size={15} /></button>
            </div>
            <span className="text-[11px]">{input.length}/5000</span>
          </div>
        </div>

        <div className="relative rounded-2xl border border-accent/30 bg-accent/[0.04] p-3">
          <div className="min-h-[180px] text-[15px] whitespace-pre-wrap break-words">
            {loading ? <span className="inline-flex items-center gap-1.5 text-fg-muted"><Loader2 size={15} className="animate-spin" /> 翻譯中…</span>
              : err ? <span className="text-red-400 text-sm">{err}</span>
              : output ? output
              : <span className="text-fg-muted">譯文會出現在這裡</span>}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1 text-fg-muted">
            {output && <button onClick={() => speak(output, target)} title="朗讀" className="hover:text-accent"><Volume2 size={15} /></button>}
            {output && <button onClick={copy} title="複製" className="hover:text-accent inline-flex items-center gap-1 text-xs">{copied ? <><Check size={14} className="text-emerald-400" /> 已複製</> : <><Copy size={14} /> 複製</>}</button>}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-fg-muted mt-4">由 Google 翻譯提供 · 專有名詞/程式碼建議自行核對</p>
    </div>
  );
}
