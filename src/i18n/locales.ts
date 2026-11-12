// 語言常數（client / server 都可 import；不含 next/headers）
export const LOCALES = ["zh", "zh-CN", "en", "ja", "ko"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_COOKIE = "LOCALE";
export const LOCALE_NAMES: Record<Locale, string> = { zh: "繁體中文", "zh-CN": "简体中文", en: "English", ja: "日本語", ko: "한국어" };
/** 內容翻譯層用的目標語言名（給 AI prompt）。 */
export const LOCALE_AI_LABEL: Record<string, string> = { en: "English", ja: "Japanese (日本語)", ko: "Korean (한국어)" };

/**
 * 簡體中文沒有自己的翻譯資料：內容一律以繁體（zh）取得，再用 OpenCC 轉成簡體。
 * 查 DB 翻譯、判斷「原文＝檢視語言」時都要先經過這裡。
 */
export function contentLocale(locale: string): string {
  return locale === "zh-CN" ? "zh" : locale;
}

/** <html lang> 用的 BCP 47 標籤。 */
export function htmlLang(locale: string): string {
  switch (locale) {
    case "en": return "en";
    case "ja": return "ja";
    case "ko": return "ko";
    case "zh-CN": return "zh-Hans-CN";
    default: return "zh-Hant-TW";
  }
}
