import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALES, LOCALE_COOKIE, type Locale } from "./locales";
import { toSimplifiedDeep } from "@/lib/zh-convert";
import zhMessages from "../../messages/zh.json";
export * from "./locales";

/** 沒 cookie 時依「地區」決定預設語言：台港澳→繁中、中國/新加坡→簡中、日本→日文、韓國→韓文、其他→英文。 */
function pickDefaultLocale(country: string, acceptLang: string): Locale {
  const c = (country || "").toUpperCase();
  if (c) {
    if (["TW", "HK", "MO"].includes(c)) return "zh";
    if (["CN", "SG"].includes(c)) return "zh-CN";
    if (c === "JP") return "ja";
    if (c === "KR") return "ko";
    return "en"; // 有國別但非中日韓 → 英文
  }
  // 沒國別 header → 退回瀏覽器語言（Accept-Language）
  const a = (acceptLang || "").toLowerCase();
  if (/^zh-(cn|sg|hans)/.test(a)) return "zh-CN";
  if (a.startsWith("zh")) return "zh";
  if (a.startsWith("ja")) return "ja";
  if (a.startsWith("ko")) return "ko";
  return "en";
}

// 簡體訊息由繁體訊息檔轉出，每個 instance 只轉一次；不另外維護 zh-CN.json，改 zh.json 就自動同步。
let simplifiedMessages: typeof zhMessages | null = null;

/**
 * 全站 i18n：語言存在 cookie（不改路由、不動 591 條既有頁面）。
 * 有 cookie 用 cookie；沒有 → 依地區/瀏覽器語言決定。
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
  if (locale === "zh-CN") {
    simplifiedMessages ??= toSimplifiedDeep(zhMessages);
    return { locale, messages: simplifiedMessages };
  }
  return {
    locale,
    messages: locale === "zh" ? zhMessages : (await import(`../../messages/${locale}.json`)).default,
  };
});
