import type { Chapter } from "./types";

/**
 * 章節顯示編號 — 用 sortIndex 衍生、不是 id
 *
 * 為什麼不用 id：
 *   林董新增 Ch72 (React 進階) sortIndex=8.5 排在 Ch08 之後、但 id=72。
 *   用戶看「Ch72」會以為是第 72 章、實際位置是 8.5。
 *
 * 規則：
 *   - sortIndex 整數 → 「Ch08」(原章節)
 *   - sortIndex .5 → 「Ch08a」(緊接後第 1 個衍生)
 *   - sortIndex .7 → 「Ch08b」(第 2 個衍生)
 *   - sortIndex .9 → 「Ch08c」
 *   - 無 sortIndex → 用 id
 *
 * 例：
 *   ch08 (id=8, sortIndex 無) → "Ch08"
 *   ch72 (id=72, sortIndex 8.5) → "Ch08a"
 *   ch73 (id=73, sortIndex 9.5) → "Ch09a"
 *   ch74 (id=74, sortIndex 9.7) → "Ch09b"
 *   ch75 (id=75, sortIndex 4.5) → "Ch04a"
 *
 * URL routing 仍用 id (/chapters/72)、顯示用 displayNumber。
 */

const SUFFIX_MAP: Record<string, string> = {
  "0.5": "a",
  "0.6": "a",
  "0.7": "b",
  "0.8": "b",
  "0.9": "c",
};

export function chapterDisplayNumber(c: Pick<Chapter, "id"> & { sortIndex?: number }): string {
  const sort = c.sortIndex ?? c.id;
  const base = Math.floor(sort);
  const frac = +(sort - base).toFixed(1);
  if (frac === 0) return String(base).padStart(2, "0");
  const key = frac.toFixed(1);
  const suffix = SUFFIX_MAP[key] ?? "x";
  return `${String(base).padStart(2, "0")}${suffix}`;
}

/** "Ch08" / "Ch08a" 帶 "Ch" 前綴 */
export function chapterDisplayLabel(c: Pick<Chapter, "id"> & { sortIndex?: number }): string {
  return `Ch${chapterDisplayNumber(c)}`;
}

/**
 * 衍生章節的 sortIndex 覆蓋表（給只拿得到 id、拿不到 sortIndex 的呼叫端用）。
 * 來源：src/data/chapters/ch72-75.json。新增衍生章節時、這裡也要補一筆。
 * 不直接 import 整包 chapters.json、避免 client bundle 膨脹。
 */
const CHAPTER_SORT_INDEX: Record<number, number> = {
  72: 8.5, // React 進階  → Ch08a
  73: 9.5, // Vue 進階    → Ch09a
  74: 9.7, // Vite        → Ch09b
  75: 4.5, // HTTP 協定    → Ch04a
  76: 9.9, // Angular     → Ch09c（前端三大框架之一）
};

/** 只有 chapter id 時、用這個算顯示編號（自動套用衍生章節的 sortIndex） */
export function chapterDisplayNumberById(id: number): string {
  return chapterDisplayNumber({ id, sortIndex: CHAPTER_SORT_INDEX[id] });
}

/** 只有 chapter id 時的 "Ch08a" 標籤 */
export function chapterDisplayLabelById(id: number): string {
  return `Ch${chapterDisplayNumberById(id)}`;
}
