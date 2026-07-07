import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALES, LOCALE_COOKIE, type Locale } from "./locales";
export * from "./locales";

/**
 * 全站 i18n：語言存在 cookie（不改路由、不動 591 條既有頁面）。
 * 預設繁中；使用者切語言後寫 cookie，下次請求就讀對應 messages（中/英/日/韓）。
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale = raw && LOCALES.includes(raw) ? raw : "zh";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
