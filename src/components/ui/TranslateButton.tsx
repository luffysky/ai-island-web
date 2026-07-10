"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Languages, Loader2, Check } from "lucide-react";

// 像 FB / IG 的「查看翻譯」：點一下把這段文字翻成你選的語言（免費 Google、零成本），可切語言、可看原文。
// 用法：<TranslateButton text={comment.content} /> —— 丟哪都行（留言、貼文、AI 回覆…）。

const LANGS = [
  { c: "zh", l: "中文" },
  { c: "en", l: "English" },
  { c: "ja", l: "日本語" },
  { c: "ko", l: "한국어" },
];

export function TranslateButton({ text, className = "" }: { text: string; className?: string }) {
  const locale = useLocale();
  const initial = LANGS.some((l) => l.c === locale) ? locale : "zh";
  const [shown, setShown] = useState(false);
  const [target, setTarget] = useState(initial);
  const [cache, setCache] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);

  async function translate(tl: string) {
    setTarget(tl);
    setShown(true);
    setMenu(false);
    if (cache[tl] != null) return;
    setLoading(true);
    try {
      const r = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, target: tl }),
      }).then((x) => x.json());
      setCache((c) => ({ ...c, [tl]: r.translated || text }));
    } catch {
      setCache((c) => ({ ...c, [tl]: text }));
    } finally {
      setLoading(false);
    }
  }

  if (!text || !text.trim()) return null;

  if (!shown) {
    return (
      <button
        onClick={() => translate(target)}
        className={`text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1 transition ${className}`}
      >
        <Languages size={12} /> 翻譯
      </button>
    );
  }

  return (
    <div className={`mt-1 ${className}`}>
      {loading ? (
        <span className="text-xs text-fg-muted inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 翻譯中…</span>
      ) : (
        <div className="text-sm whitespace-pre-wrap break-words rounded-lg bg-bg-elevated/60 p-2 border border-border/40">{cache[target]}</div>
      )}
      <div className="flex items-center gap-3 mt-1 text-xs">
        <button onClick={() => setShown(false)} className="text-fg-muted hover:text-accent">顯示原文</button>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="text-fg-muted hover:text-accent inline-flex items-center gap-0.5">
            <Languages size={11} /> {LANGS.find((l) => l.c === target)?.l ?? target}
          </button>
          {menu && (
            <div className="absolute z-30 mt-1 left-0 bg-bg-card border border-border rounded-lg shadow-xl p-1 min-w-[96px]">
              {LANGS.map((l) => (
                <button key={l.c} onClick={() => translate(l.c)} className="flex items-center gap-1 w-full text-left px-2 py-1 rounded hover:bg-bg-elevated">
                  {l.c === target ? <Check size={11} className="text-accent" /> : <span className="w-[11px]" />} {l.l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
