/**
 * AI 島反應表情包（動態 emoji）。
 * 用 Google Noto Animated Emoji（動態 WebP）當視覺，emoji 當 fallback。
 *
 * 自架路線（林董定）：
 *  - 現在：`NOTO_BASE` 指向 Google gstatic CDN（動態 WebP，馬上有）。
 *  - 之後自架：把用到的 `{code}/512.webp` 下載進 `public/noto/`，把 NOTO_BASE 改成 "/noto"。
 *    （檔名就是 code，例如 public/noto/1f92f/512.webp）
 *  - GIPHY 搜尋是第二版，先不接（避免被第三方 API 卡脖子）。
 */

/** Noto animated emoji 素材來源。要自架就改成 "/noto"（把 webp 放 public/noto/{code}/512.webp）。 */
export const NOTO_BASE = "https://fonts.gstatic.com/s/e/notoemoji/latest";

/** 由 Noto code 組出動態 WebP 網址。 */
export function notoWebp(code: string): string {
  return `${NOTO_BASE}/${code}/512.webp`;
}

export interface Reaction {
  key: string;
  /** i18n key（reactions namespace）；UI 顯示的標籤 */
  labelKey: string;
  /** 靜態 emoji（fallback、也給 aria-label / 純文字場合） */
  emoji: string;
  /** Noto animated emoji 的 code（路徑段） */
  code: string;
}

/** 學習反饋反應包：懂了 / 卡住 / 太神 / 哈哈 / 加油 / 讚 / 愛 / 慶祝。 */
export const LEARN_REACTIONS: Reaction[] = [
  { key: "got_it",   labelKey: "reactGotIt",   emoji: "💡", code: "1f4a1" },
  { key: "stuck",    labelKey: "reactStuck",   emoji: "😵‍💫", code: "1f635_200d_1f4ab" },
  { key: "amazing",  labelKey: "reactAmazing", emoji: "🤯", code: "1f92f" },
  { key: "haha",     labelKey: "reactHaha",    emoji: "😂", code: "1f602" },
  { key: "fighting", labelKey: "reactFighting",emoji: "💪", code: "1f4aa" },
  { key: "like",     labelKey: "reactLike",    emoji: "👍", code: "1f44d" },
  { key: "love",     labelKey: "reactLove",    emoji: "❤️", code: "2764_fe0f" },
  { key: "celebrate",labelKey: "reactCelebrate",emoji: "🎉", code: "1f389" },
];

/** 論壇那組（沿用既有 👍❤️🔥🎉🤔👀 的 emoji，補上 Noto code 讓它動起來）。 */
export const FORUM_REACTION_CODES: Record<string, string> = {
  "👍": "1f44d",
  "❤️": "2764_fe0f",
  "🔥": "1f525",
  "🎉": "1f389",
  "🤔": "1f914",
  "👀": "1f440",
  "😂": "1f602",
  "🙌": "1f64c",
};

/** emoji → Noto code（找不到就回 undefined，AnimatedEmoji 會退回純 emoji）。 */
export function codeForEmoji(emoji: string): string | undefined {
  return FORUM_REACTION_CODES[emoji] ?? LEARN_REACTIONS.find((r) => r.emoji === emoji)?.code;
}
