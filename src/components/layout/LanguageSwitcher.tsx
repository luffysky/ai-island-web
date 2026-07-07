"use client";

import { useLocale } from "next-intl";
import { Languages } from "lucide-react";

/**
 * 語言切換（EN ⇄ 中）。寫 LOCALE cookie 後整頁 reload → 下次請求 server 讀新語言。
 * cookie-based，不改路由。
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const next = locale === "en" ? "zh" : "en";
  const switchTo = () => {
    document.cookie = `LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
  return (
    <button
      onClick={switchTo}
      title="Language / 語言"
      aria-label="Switch language"
      className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-full border border-border hover:border-accent/50 hover:bg-bg-elevated transition text-xs font-semibold ${className}`}
    >
      <Languages size={14} className="text-accent" />
      {locale === "en" ? "中" : "EN"}
    </button>
  );
}
