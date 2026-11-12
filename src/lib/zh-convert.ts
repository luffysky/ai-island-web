// 繁體（台灣用語）→ 簡體（大陸用語）。用 OpenCC 字詞表在本機轉，不打任何 API。
// 簡體版不另外存翻譯：介面字串、DB 內容都從繁體原文即時轉出來。
import * as OpenCC from "opencc-js/t2cn";

let converter: ((text: string) => string) | null = null;

export function toSimplified(text: string): string {
  if (!text || !/[㐀-鿿]/.test(text)) return text;
  converter ??= OpenCC.Converter({ from: "twp", to: "cn" });
  return converter(text);
}

/** 把物件裡所有字串值轉成簡體（key 不動）。用在訊息檔與 DB 內容物件。 */
export function toSimplifiedDeep<T>(value: T): T {
  if (typeof value === "string") return toSimplified(value) as T;
  if (Array.isArray(value)) return value.map((v) => toSimplifiedDeep(v)) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toSimplifiedDeep(v);
    return out as T;
  }
  return value;
}
