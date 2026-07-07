// 語言常數（client / server 都可 import；不含 next/headers）
export const LOCALES = ["zh", "en", "ja", "ko"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_COOKIE = "LOCALE";
export const LOCALE_NAMES: Record<Locale, string> = { zh: "繁體中文", en: "English", ja: "日本語", ko: "한국어" };
/** 內容翻譯層用的目標語言名（給 AI prompt）。 */
export const LOCALE_AI_LABEL: Record<string, string> = { en: "English", ja: "Japanese (日本語)", ko: "Korean (한국어)" };
