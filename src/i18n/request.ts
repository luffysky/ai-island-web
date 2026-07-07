import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALES, LOCALE_COOKIE, type Locale } from "./locales";
export * from "./locales";

/** 沒 cookie 時依「地區」決定預設語言：中文地區→中文、日本→日文、韓國→韓文、其他→英文。 */
function pickDefaultLocale(country: string, acceptLang: string): Locale {
  const c = (country || "").toUpperCase();
  if (c) {
    if (["TW", "HK", "CN", "MO"].includes(c)) return "zh";
    if (c === "JP") return "ja";
    if (c === "KR") return "ko";
    return "en"; // 有國別但非中日韓 → 英文
  }
  // 沒國別 header → 退回瀏覽器語言（Accept-Language）
  const a = (acceptLang || "").toLowerCase();
  if (a.startsWith("zh")) return "zh";
  if (a.startsWith("ja")) return "ja";
  if (a.startsWith("ko")) return "ko";
  return "en";
}

/**
 * 全站 i18n：語言存在 cookie（不改路由、不動 591 條既有頁面）。
 * 有 cookie 用 cookie；沒有 → 依地區/瀏覽器語言決定（中→中、JP→日、KR→韓、其他→英）。
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  let locale: Locale;
  if (raw && LOCALES.includes(raw)) {
    locale = raw;
  } else {
    const h = await headers();
    const country = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || h.get("x-country") || "";
    locale = pickDefaultLocale(country, h.get("accept-language") || "");
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
