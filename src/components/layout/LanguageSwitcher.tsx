"use client";

import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, LOCALE_COOKIE } from "@/i18n/locales";

/**
 * 語言切換（中/英/日/韓）。寫 LOCALE cookie 後整頁 reload → 下次請求 server 讀新語言。
 * cookie-based，不改路由。
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const change = (l: string) => {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <Languages size={14} className="text-accent absolute left-2 pointer-events-none" />
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        aria-label="Language / 語言 / 言語 / 언어"
        className="appearance-none pl-7 pr-6 py-1.5 rounded-full border border-border bg-bg-card/90 text-xs font-semibold hover:border-accent/50 transition cursor-pointer outline-none focus:border-accent"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
      <svg className="absolute right-2 pointer-events-none text-fg-muted" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>
    </span>
  );
}
