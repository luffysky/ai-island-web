"use client";

import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, LOCALE_COOKIE } from "@/i18n/locales";

/** 手機用短碼、桌面用全名，避免 header 被「繁體中文」撐爆。 */
const LOCALE_SHORT: Record<string, string> = { zh: "繁", en: "EN", ja: "日", ko: "한" };

/**
 * 語言切換（中/英/日/韓）。寫 LOCALE cookie 後整頁 reload → 下次請求 server 讀新語言。
 * cookie-based，不改路由。視覺上是一顆小藥丸（手機只顯示短碼），實際互動靠一個透明的原生 <select> 疊在上面。
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const change = (l: string) => {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
  return (
    <span
      className={`relative inline-flex items-center h-8 rounded-full border border-border bg-bg-card/90 hover:border-accent/50 transition shrink-0 ${className}`}
    >
      <Languages size={14} className="text-accent ml-2 shrink-0" />
      {/* 手機短碼 / 桌面全名 */}
      <span className="mx-1 text-xs font-semibold sm:hidden">{LOCALE_SHORT[locale] ?? locale}</span>
      <span className="ml-1 mr-1.5 text-xs font-semibold hidden sm:inline whitespace-nowrap">
        {LOCALE_NAMES[locale as keyof typeof LOCALE_NAMES] ?? locale}
      </span>
      <svg className="mr-2 shrink-0 text-fg-muted" width="10" height="10" viewBox="0 0 10 10">
        <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      {/* 透明原生 select 疊在整顆藥丸上：點哪都能叫出系統語言選單，下拉仍顯示全名 */}
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        aria-label="Language / 語言 / 言語 / 언어"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
    </span>
  );
}
