"use client";

import { useLocale } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { Languages, Check, ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_NAMES, LOCALE_COOKIE } from "@/i18n/locales";

/** 手機用短碼、桌面用全名。 */
const LOCALE_SHORT: Record<string, string> = { zh: "繁", en: "EN", ja: "日", ko: "한" };

/**
 * 語言切換（中/英/日/韓）。自訂下拉選單（不用原生 <select>，才能好好美化 + 對比清楚）。
 * 選了寫 LOCALE cookie 後整頁 reload → 下次請求 server 讀新語言。cookie-based、不改路由。
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const change = (l: string) => {
    if (l === locale) { setOpen(false); return; }
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Language / 語言 / 言語 / 언어"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 h-8 pl-2 pr-1.5 rounded-full border border-border bg-bg-card/90 text-xs font-semibold text-fg hover:border-accent/50 hover:bg-bg-elevated transition"
      >
        <Languages size={14} className="text-accent shrink-0" />
        <span className="sm:hidden">{LOCALE_SHORT[locale] ?? locale}</span>
        <span className="hidden sm:inline whitespace-nowrap">{LOCALE_NAMES[locale as keyof typeof LOCALE_NAMES] ?? locale}</span>
        <ChevronDown size={13} className={`text-fg-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-40 rounded-xl border border-border bg-bg-card shadow-xl ring-1 ring-black/5 overflow-hidden z-[60] py-1 animate-[fadeIn_.12s_ease-out]"
        >
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => change(l)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${
                  active ? "bg-accent/10 text-accent font-semibold" : "text-fg hover:bg-bg-elevated"
                }`}
              >
                <span className={`w-5 text-center text-xs font-bold ${active ? "text-accent" : "text-fg-muted"}`}>{LOCALE_SHORT[l] ?? l}</span>
                <span className="flex-1">{LOCALE_NAMES[l]}</span>
                {active && <Check size={15} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
